var pathModule = require('path');
var Promise = require('bluebird');
var urlTools = require('urltools');
var estraverse = require('estraverse');
var readPkgUp = require('read-pkg-up');

module.exports = function (queryObj, options) {
    options = options || {};
    return function bundleWebpack(assetGraph) {
        var webpack;
        try {
            webpack = require('webpack');
        } catch (e) {
            if (options.configPath) {
                assetGraph.emit('error', new Error('Webpack config path given (' + options.configPath + '), but webpack itself could not be found. Please install it in your project: ' + e.stack));
                return;
            }
        }

        var triedConfigPaths = [];

        function loadWebpackConfig() {
            return Promise.resolve().then(function () {
                // First try to look for the config in the assetGraph root:
                var configPath = options.configPath || pathModule.resolve(urlTools.fileUrlToFsPath(assetGraph.root), 'webpack.config.js');
                triedConfigPaths.push(configPath);
                try {
                    return require.main.require(configPath);
                } catch (err) {
                    if (err.code !== 'MODULE_NOT_FOUND' || options.configPath) {
                        throw err;
                    }
                    // webpack.config.js was not found in the assetgraph's root.
                    // Look for it in the directory that contains the nearest package.json:
                    return readPkgUp()
                    .then(function (readPkgUpResult) {
                        if (readPkgUpResult.path) {
                            var alternativeConfigPath = pathModule.resolve(pathModule.dirname(readPkgUpResult.path), 'webpack.config.js');
                            if (alternativeConfigPath !== configPath) {
                                configPath = alternativeConfigPath;
                                triedConfigPaths.push(configPath);
                                return require.main.require(configPath);
                            }
                        }
                        throw new Error('Could not load webpack config');
                    });
                }
            });
        }
        return loadWebpackConfig().then(function (config) {
            config.context = config.context || urlTools.fileUrlToFsPath(assetGraph.root);
            config.output = config.output || {};
            if (typeof config.output.path === 'string') {
                config.output.path = pathModule.resolve(config.context, config.output.path);
            }
            config.devtool = config.devtool || 'source-map';
            config.output.devtoolModuleFilenameTemplate = config.output.devtoolModuleFilenameTemplate || '/[resource-path]';

            var basePath = config.output.path;
            if (config.output.publicPath) {
                basePath = pathModule.resolve(config.context, config.output.publicPath.replace(/^\//, ''));
            }

            var hasHtmlWebpackPlugin = Array.isArray(config.plugins) && config.plugins.some(function (plugin) {
                return plugin.constructor.name === 'HtmlWebpackPlugin';
            });

            if (!hasHtmlWebpackPlugin) {
                // HtmlWebpackPlugin is not in the picture, so we can assume that the
                // relevant entry points are referenced by assets that we have
                // in the graph. Only build the actually referenced entry points:
                var seenReferencedEntryPoints = false;
                var potentialBundlePaths = assetGraph.findRelations({
                    to: {
                        url: /\.js(?:\?|$)/
                    }
                }, true).map(function (relation) {
                    return urlTools.fileUrlToFsPath(assetGraph.resolveUrl(relation.from.nonInlineAncestor.url, relation.to.url));
                });

                var createAbsolutePath = function (name) {
                    return pathModule.resolve(
                        basePath,
                        name ? config.output.filename.replace(/\[name]/g, name) : config.output.filename
                    );
                };

                if (config.entry && typeof config.entry === 'object' && !Array.isArray(config.entry)) {
                    config.entry = Object.keys(config.entry).reduce(function (entryPointsToBeBuilt, entryPointName) {
                        if (potentialBundlePaths.indexOf(createAbsolutePath(entryPointName)) !== -1) {
                            entryPointsToBeBuilt[entryPointName] = config.entry[entryPointName];
                        }
                        return entryPointsToBeBuilt;
                    }, {});

                    seenReferencedEntryPoints = Object.keys(config.entry).length > 0;
                } else {
                    // array or string
                    if (potentialBundlePaths.indexOf(createAbsolutePath()) !== -1) {
                        seenReferencedEntryPoints = true;
                    }
                }

                if (!seenReferencedEntryPoints) {
                    assetGraph.emit('info', new Error('No matching webpack bundles found, skipping'));
                    return;
                }
            }

            var compiler = webpack(config);
            var outputFileSystem = new webpack.MemoryOutputFileSystem();
            compiler.outputFileSystem = outputFileSystem;
            return Promise.fromNode(function (cb) {
                compiler.run(cb);
            }).then(function (stats) {
                var statsObj = stats.toJson({assets: true});
                var existingAssetsWereReplaced;
                var assetInfos = [];
                var urlByAssetName = {};
                statsObj.assets.forEach(function (asset) {
                    var url = urlTools.fsFilePathToFileUrl(pathModule.resolve(basePath, asset.name));
                    var outputPath = urlTools.fsFilePathToFileUrl(pathModule.resolve(config.output.path, asset.name));
                    assetInfos.push({
                        url: url,
                        output: outputPath,
                        name: asset.name
                    });
                    urlByAssetName[asset.name] = url;
                    var existingAsset = assetGraph.findAssets({url: url})[0];
                    if (existingAsset) {
                        assetGraph.emit('info', new Error('Replacing previously built artifact: ' + url));
                        existingAssetsWereReplaced = true;
                        existingAsset.incomingRelations.forEach(function (relation) {
                            relation.to = {url: url};
                        });
                        assetGraph.removeAsset(existingAsset);
                    }
                });
                assetGraph.emit('info', stats.toString({colors: true}));
                if (existingAssetsWereReplaced) {
                    assetGraph.emit('info', new Error('Please remove ' + config.output.path + ' before building with assetgraph to speed up the process'));
                }
                return assetGraph.loadAssets(assetInfos.map(function (url) {
                    return {
                        isInitial: /\.html$/.test(url.url),
                        url: url.url,
                        rawSrc: outputFileSystem.readFileSync(urlTools.fileUrlToFsPath(url.output))
                    };
                })).then(function () {
                    // Pick up CSS assets and attach them to each entry point
                    Object.keys(statsObj.assetsByChunkName).forEach(function (chunkName) {
                        var assets = statsObj.assetsByChunkName[chunkName];
                        var javaScriptAssets = assets.filter(function (asset) { return /\.js$/.test(asset); });
                        var cssAssets = assets.filter(function (asset) { return /\.css$/.test(asset); });
                        if (javaScriptAssets.length === 1 && cssAssets.length > 0) {
                            var entryPointRelations = assetGraph.findRelations(function (relation) {
                                if (relation.type !== 'HtmlScript' || !relation.to || !relation.to.url) {
                                    return;
                                }
                                var absoluteUrl = assetGraph.resolveUrl(relation.from.nonInlineAncestor.url, relation.to.url);
                                return absoluteUrl === urlByAssetName[javaScriptAssets[0]];
                            }, true);
                            entryPointRelations.forEach(function (entryPointRelation) {
                                cssAssets.forEach(function (cssAsset) {
                                    var htmlStyle = new assetGraph.HtmlStyle({
                                        hrefType: 'rootRelative',
                                        to: assetGraph.findAssets({url: urlByAssetName[cssAsset]})[0]
                                    });
                                    htmlStyle.attach(entryPointRelation.from, 'last');
                                });
                            });
                        }
                    });

                    assetGraph.findAssets({
                        type: 'JavaScript',
                        url: assetInfos.map(function (url) { return url.url; })
                    }).forEach(function (asset) {
                        var replacementsMade = false;
                        var requireEnsureAstTemplate;
                        estraverse.traverse(asset.parseTree, {
                            enter: function (node) {
                                // Detect the __webpack_require__.e = function requireEnsure(chunkId, callback) { ... declaration at the top of a bundle
                                if (node.type === 'AssignmentExpression' &&
                                    node.operator === '=' &&
                                    node.left.type === 'MemberExpression' &&
                                    node.left.object.type === 'Identifier' &&
                                    node.left.object.name === '__webpack_require__' &&
                                    node.left.property.type === 'Identifier' &&
                                    node.left.property.name === 'e' &&
                                    node.right.type === 'FunctionExpression' &&
                                    node.right.id &&
                                    node.right.id.type === 'Identifier' &&
                                    node.right.id.name === 'requireEnsure'
                                ) {
                                    node.right.params.push({ type: 'Identifier', name: '_assetgraph_url' });
                                    // Replace script.src = ... in the function body:
                                    estraverse.traverse(node.right.body, {
                                        enter: function (node) {
                                            if (node.type === 'ExpressionStatement' &&
                                                node.expression.type === 'AssignmentExpression' &&
                                                node.expression.left.type === 'MemberExpression' &&
                                                node.expression.left.object.type === 'Identifier' &&
                                                node.expression.left.object.name === 'script' &&
                                                node.expression.left.property.type === 'Identifier' &&
                                                node.expression.left.property.name === 'src'
                                            ) {
                                                var templateAst = node.expression.right;
                                                // Quick and dirty evaluator
                                                requireEnsureAstTemplate = function (chunkId) {
                                                    var result = '';
                                                    (function visit(node) {
                                                        if (
                                                            node.type === 'MemberExpression' &&
                                                            node.object.type === 'Identifier' &&
                                                            node.object.name === '__webpack_require__' &&
                                                            node.property.type === 'Identifier' &&
                                                            node.property.name === 'p'
                                                        ) {
                                                            // FIXME: Fall back to config.output.path instead of hardcoding /dist/:
                                                            result += (config.output.publicPath || '/dist/');
                                                        } else if (node.type === 'BinaryExpression' && node.operator === '+') {
                                                            visit(node.left);
                                                            visit(node.right);
                                                        } else if (node.type === 'LogicalExpression' && node.operator === '||') {
                                                            var resultBeforeLeft = result;
                                                            visit(node.left);
                                                            if (result === resultBeforeLeft) {
                                                                visit(node.right);
                                                            }
                                                        } else if (
                                                            node.type === 'MemberExpression' &&
                                                            node.computed &&
                                                            node.property.type === 'Identifier' &&
                                                            node.property.name === 'chunkId' &&
                                                            node.object.type === 'ObjectExpression'
                                                        ) {
                                                            node.object.properties.forEach(function (propertyNode) {
                                                                if (propertyNode.key.type === 'Literal' && String(propertyNode.key.value) === String(chunkId)) {
                                                                    visit(propertyNode.value);
                                                                }
                                                            });
                                                        } else if (node.type === 'Literal') {
                                                            result += String(node.value);
                                                        } else if (node.type === 'Identifier' && node.name === 'chunkId') {
                                                            result += chunkId;
                                                        } else {
                                                            throw new Error('unsupported ' + node.type + ': ' + require('escodegen').generate(node));
                                                        }
                                                    }(templateAst));
                                                    return result;
                                                };
                                                node.expression.right = {
                                                    type: 'BinaryExpression',
                                                    operator: '||',
                                                    left: {
                                                        type: 'Identifier',
                                                        name: '_assetgraph_url'
                                                    },
                                                    right: node.expression.right
                                                };
                                            }
                                        }
                                    });
                                    replacementsMade = true;
                                } else if (
                                    node.type === 'VariableDeclaration' &&
                                    node.declarations.length === 1 &&
                                    node.declarations[0].type === 'VariableDeclarator' &&
                                    node.declarations[0].id.type === 'Identifier' &&
                                    node.declarations[0].id.name === 'map' &&
                                    node.declarations[0].init &&
                                    node.declarations[0].init.type === 'ObjectExpression' &&
                                    node.declarations[0].init.properties.length > 0 &&
                                    node.declarations[0].init.properties.every(propertyNode =>
                                        propertyNode.value.type === 'ArrayExpression' &&
                                        propertyNode.value.elements.length < 3
                                    )
                                ) {
                                    // var map = {
                                    //     './splita': [
                                    //         1,
                                    //         1
                                    //     ],
                                    //     './splita.js': [
                                    //         1,
                                    //         1
                                    //     ],
                                    //     './splitb': [
                                    //         2,
                                    //         0
                                    //     ],
                                    //     './splitb.js': [
                                    //         2,
                                    //         0
                                    //     ]
                                    // };
                                    // Add a 3rd element to each value that uses .toString('url')
                                    node.declarations[0].init.properties.forEach(function (propertyNode) {
                                        // Not sure this is necessary yet, but pad with undefined so we always
                                        // add to the 3rd position
                                        while (propertyNode.value.elements.length < 2) {
                                            propertyNode.value.elements.push({
                                                type: 'Identifier',
                                                value: 'undefined'
                                            });
                                        }
                                        propertyNode.value.elements.push({
                                            type: 'CallExpression',
                                            callee: {
                                                type: 'MemberExpression',
                                                computed: false,
                                                object: {
                                                    type: 'Literal',
                                                    value: requireEnsureAstTemplate(String(propertyNode.value.elements[1].value))
                                                },
                                                property: {
                                                    type: 'Identifier',
                                                    name: 'toString'
                                                }
                                            },
                                            arguments: [
                                                {
                                                    type: 'Literal',
                                                    value: 'url'
                                                }
                                            ]
                                        });
                                    });
                                    replacementsMade = true;
                                } else if (
                                    node.type === 'FunctionDeclaration' &&
                                    node.id.type === 'Identifier' &&
                                    node.id.name === 'webpackAsyncContext'
                                ) {
                                    // function webpackAsyncContext(req) {
                                    //     var ids = map[req];
                                    //     if (!ids)
                                    //         return Promise.reject(new Error('Cannot find module \'' + req + '\'.'));
                                    //     return __webpack_require__.e(ids[1]).then(function () {
                                    //         return __webpack_require__(ids[0]);
                                    //     });
                                    // }
                                    // Add ids[2] to the argument list in the __webpack_require__.e call so that the JavaScriptStaticUrl is passed on
                                    var lastStatement = node.body.body[node.body.body.length - 1];
                                    if (lastStatement &&
                                        lastStatement.type === 'ReturnStatement' &&
                                        lastStatement.argument.type === 'CallExpression' &&
                                        lastStatement.argument.callee.type === 'MemberExpression' &&
                                        lastStatement.argument.callee.object.type === 'CallExpression' &&
                                        lastStatement.argument.callee.object.callee.type === 'MemberExpression' &&
                                        lastStatement.argument.callee.object.callee.object.type === 'Identifier' &&
                                        lastStatement.argument.callee.object.callee.object.name === '__webpack_require__' &&
                                        lastStatement.argument.callee.object.callee.property.type === 'Identifier' &&
                                        lastStatement.argument.callee.object.callee.property.name === 'e' &&
                                        lastStatement.argument.callee.object.arguments.length === 1 &&
                                        lastStatement.argument.callee.object.arguments[0].type === 'MemberExpression' &&
                                        lastStatement.argument.callee.object.arguments[0].computed &&
                                        lastStatement.argument.callee.object.arguments[0].object.type === 'Identifier' &&
                                        lastStatement.argument.callee.object.arguments[0].object.name === 'ids' &&
                                        lastStatement.argument.callee.object.arguments[0].property.type === 'Literal'
                                    ) {
                                        lastStatement.argument.callee.object.arguments.push({
                                            type: 'MemberExpression',
                                            computed: true,
                                            object: {
                                                type: 'Identifier',
                                                name: 'ids'
                                            },
                                            property: {
                                                type: 'Literal',
                                                value: 2
                                            }
                                        });
                                        replacementsMade = true;
                                    }
                                } else if (
                                    node.type === 'CallExpression' &&
                                    node.callee.type === 'MemberExpression' &&
                                    node.callee.object.type === 'Identifier' &&
                                    node.callee.object.name === '__webpack_require__' &&
                                    node.callee.property.type === 'Identifier' &&
                                    node.callee.property.name === 'e' &&
                                    node.arguments.length >= 1 &&
                                    node.arguments[0].type === 'Literal' &&
                                    typeof node.arguments[0].value === 'number' &&
                                    requireEnsureAstTemplate
                                ) {
                                    node.arguments.push({
                                        type: 'CallExpression',
                                        callee: {
                                            type: 'MemberExpression',
                                            computed: false,
                                            object: {
                                                type: 'Literal',
                                                value: requireEnsureAstTemplate(node.arguments[0].value)
                                            },
                                            property: {
                                                type: 'Identifier',
                                                name: 'toString'
                                            }
                                        },
                                        arguments: [
                                            {
                                                type: 'Literal',
                                                value: 'url'
                                            }
                                        ]
                                    });
                                    replacementsMade = true;
                                } else if (
                                    node.type === 'FunctionExpression' &&
                                    node.params.length === 3 &&
                                    node.params[0].type === 'Identifier' && node.params[0].name === 'module' &&
                                    node.params[1].type === 'Identifier' && node.params[1].name === 'exports' &&
                                    node.params[2].type === 'Identifier' && node.params[2].name === '__webpack_require__' &&
                                    node.leadingComments && (node.leadingComments.length === 2 || node.leadingComments.length === 3) &&
                                    /^ \d+ $/.test(node.leadingComments[node.leadingComments.length - 2].value) &&
                                    node.leadingComments[node.leadingComments.length - 1].value === '*' &&
                                    node.body.type === 'BlockStatement' &&
                                    node.body.body.length === 1 &&
                                    node.body.body[0].type === 'ExpressionStatement' &&
                                    node.body.body[0].expression.type === 'AssignmentExpression' &&
                                    node.body.body[0].expression.left.type === 'MemberExpression' &&
                                    node.body.body[0].expression.left.object.type === 'Identifier' &&
                                    node.body.body[0].expression.left.object.name === 'module' &&
                                    node.body.body[0].expression.left.property.type === 'Identifier' &&
                                    node.body.body[0].expression.left.property.name === 'exports' &&
                                    node.body.body[0].expression.right.type === 'BinaryExpression' &&
                                    node.body.body[0].expression.right.operator === '+' &&
                                    node.body.body[0].expression.right.left.type === 'MemberExpression' &&
                                    node.body.body[0].expression.right.left.object.type === 'Identifier' &&
                                    node.body.body[0].expression.right.left.object.name === node.params[2].name &&
                                    node.body.body[0].expression.right.left.property.type === 'Identifier' &&
                                    node.body.body[0].expression.right.left.property.name === 'p' &&
                                    node.body.body[0].expression.right.right.type === 'Literal' &&
                                    typeof node.body.body[0].expression.right.right.value === 'string'
                                ) {
                                    node.body.body[0].expression.right = {
                                        type: 'CallExpression',
                                        range: node.body.body[0].expression.right.range,
                                        callee: {
                                            type: 'MemberExpression',
                                            computed: false,
                                            object: {
                                                type: 'Literal',
                                                // FIXME: Fall back to config.output.path instead of hardcoding /dist/:
                                                value: (config.output.publicPath || '/dist/') + node.body.body[0].expression.right.right.value
                                            },
                                            property: {
                                                type: 'Identifier',
                                                name: 'toString'
                                            }
                                        },
                                        arguments: [
                                            {
                                                type: 'Literal',
                                                value: 'url'
                                            }
                                        ]
                                    };
                                    replacementsMade = true;
                                }
                            }
                        });
                        if (replacementsMade) {
                            asset.markDirty();
                            [].concat(asset.outgoingRelations).forEach(function (relation) {
                                asset.removeRelation(relation);
                            });
                            asset._outgoingRelations = undefined;
                            asset.isPopulated = false;
                            asset.populate();
                        }
                    });
                });
            });
        }, function (err) {
            if (webpack) {
                assetGraph.emit('info', new Error('Webpack is installed, but could not load the webpack config (tried ' + triedConfigPaths.join(' ') + '): ' + err.message));
            }
        });
    };
};

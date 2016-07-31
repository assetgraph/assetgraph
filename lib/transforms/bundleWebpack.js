var pathModule = require('path');
var Promise = require('bluebird');
var urlTools = require('urltools');
var estraverse = require('estraverse');

module.exports = function (queryObj, options) {
    options = options || {};
    return function (assetGraph) {
        var webpack;
        try {
            webpack = require('webpack');
        } catch (e) {}

        var configPath = options.configPath || pathModule.resolve(urlTools.fileUrlToFsPath(assetGraph.root), 'webpack.config.js');

        var config;
        try {
            config = require(configPath);
        } catch (err) {
            if (typeof options.configPath === 'undefined') {
                if (webpack) {
                    assetGraph.emit('warn', new Error('Could not load webpack config ' + configPath + ', but webpack is installed: ' + err.message));
                }
                return;
            } else {
                err.message = 'Could not load webpack config ' + options.configPath + ': ' + err.message;
                throw err;
            }
        }
        config.context = config.context || urlTools.fileUrlToFsPath(assetGraph.root);
        config.output = config.output || {};
        if (typeof config.output.path === 'string') {
            config.output.path = pathModule.resolve(config.context, config.output.path);
        }
        config.devtool = config.devtool || 'source-map';
        config.output.devtoolModuleFilenameTemplate = config.output.devtoolModuleFilenameTemplate || '/[resource-path]';

        var compiler = webpack(config);
        var outputFileSystem = new webpack.MemoryOutputFileSystem();
        compiler.outputFileSystem = outputFileSystem;

        return Promise.fromNode(function (cb) {
            compiler.run(cb);
        }).then(function (stats) {
            var existingAssetsWereReplaced;
            var urls = [];
            stats.toJson({assets: true}).assets.forEach(function (asset) {
                var url = urlTools.fsFilePathToFileUrl(pathModule.resolve(config.output.path, asset.name));
                urls.push(url);
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
            return assetGraph.loadAssets(urls.map(function (url) {
                return {
                    url: url,
                    rawSrc: outputFileSystem.readFileSync(urlTools.fileUrlToFsPath(url))
                };
            })).then(function () {
                var bundleAsset = assetGraph.findAssets({url: urlTools.fsFilePathToFileUrl(pathModule.resolve(config.output.path, config.output.filename))})[0];
                var replacementsMade = false;
                estraverse.traverse(bundleAsset.parseTree, {
                    enter: function (node) {
                        if (node.type === 'FunctionExpression' &&
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
                    bundleAsset.markDirty();
                    bundleAsset._outgoingRelations.forEach(function (relation) {
                        assetGraph.removeRelation(relation);
                    });
                    bundleAsset._outgoingRelations = undefined;
                    bundleAsset.isPopulated = false;
                    bundleAsset.populate();
                }
            });
        });
    };
};

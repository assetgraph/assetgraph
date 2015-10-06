var urlTools = require('urltools'),
    escodegen = require('escodegen'),
    estraverse = require('estraverse'),
    esanimate = require('esanimate');

module.exports = function (options) {
    options = options || {};
    return function registerRequireJsConfig(assetGraph) {
        var requireJsConfig = (assetGraph.requireJsConfig = assetGraph.requireJsConfig || {});

        requireJsConfig.paths = requireJsConfig.paths || {};
        requireJsConfig.shim = {};
        requireJsConfig.foundConfig = false;
        requireJsConfig.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound = !!options.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound;

        requireJsConfig.findLongestPathsPrefix = function (moduleName) {
            var fragments = moduleName.split('/');

            for (var i = fragments.length ; i > 0 ; i -= 1) {
                var prefix = fragments.slice(0, i).join('/');
                if (prefix in this.paths) {
                    return prefix;
                }
            }
        };

        requireJsConfig.resolveModuleName = function (moduleName) {
            var longestPathsPrefix = this.findLongestPathsPrefix(moduleName);
            if (longestPathsPrefix) {
                if (longestPathsPrefix === moduleName) {
                    return this.paths[longestPathsPrefix];
                } else {
                    return urlTools.resolveUrl(this.paths[longestPathsPrefix].replace(/\/?$/, '/'), moduleName.replace(longestPathsPrefix + '/', ''));
                }
            } else {
                return moduleName;
            }
        };

        requireJsConfig.getModuleNames = function (asset, fallbackBaseUrl) {
            if (asset.isInline) {
                return null;
            }

            var baseUrl = (requireJsConfig.baseUrl && requireJsConfig.baseUrl) || fallbackBaseUrl,
                modulePrefixByPath = {},
                modulePaths = [];

            // TODO: Cache the below
            Object.keys(requireJsConfig.paths).forEach(function (modulePrefix) {
                var modulePath = requireJsConfig.paths[modulePrefix].replace(baseUrl, '').replace(/\/$/, '');
                modulePrefixByPath[modulePath] = modulePrefix;
                modulePaths.push(modulePath);
            });
            var modulePathsOrderedByLengthDesc = modulePaths.sort(function (a, b) {
                return b.length - a.length;
            });

            var canonicalModuleName = urlTools.buildRelativeUrl(baseUrl, asset.url).replace(/\.js$/, ''),
                moduleNames = [canonicalModuleName];
            for (var i = 0 ; i < modulePathsOrderedByLengthDesc.length ; i += 1) {
                var path = modulePathsOrderedByLengthDesc[i];
                if (canonicalModuleName.indexOf(path + '/') === 0) {
                    moduleNames.push(canonicalModuleName.replace(path, modulePrefixByPath[path]));
                }
            }
            return moduleNames;
        };

        requireJsConfig.getModuleName = function (asset, fallbackBaseUrl) {
            if (asset.isInline) {
                return null;
            }
            return requireJsConfig.getModuleNames(asset, fallbackBaseUrl)[0];
        };

        function registerShimArray(moduleName, arrayNode, javaScript) {
            requireJsConfig.shim[moduleName] = requireJsConfig.shim[moduleName] || {};
            var deps = (requireJsConfig.shim[moduleName].deps = requireJsConfig.shim[moduleName].deps || []);
            arrayNode.elements.forEach(function (elementNode) {
                if (elementNode.type === 'Literal' && typeof elementNode.value === 'string') {
                    if (deps.indexOf(elementNode.value) === -1) {
                        deps.push(elementNode.value);
                    }
                } else {
                    assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: [...]}}) syntax: ' + escodegen.generate(arrayNode)));
                }
            });
        }

        requireJsConfig.registerConfigInJavaScript = function (javaScript, baseAsset) {
            if (!baseAsset) {
                var incomingRelationsFromHtml = assetGraph.findRelations({to: javaScript, from: {type: 'Html'}});
                if (incomingRelationsFromHtml.length > 0) {
                    baseAsset = incomingRelationsFromHtml[0].from.nonInlineAncestor; // Could be a conditional comment.
                } else {
                    baseAsset = javaScript;
                }
            }
            if (baseAsset) {
                var htmlUrl = baseAsset.url,
                    extractRequireJsConfig = function (objAst) {
                        objAst.properties.forEach(function (property) {
                            if (property.key.type === 'Identifier' && property.key.name === 'baseUrl' && property.value.type === 'Literal' && typeof property.value.value === 'string') {
                                requireJsConfig.baseUrl = assetGraph.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''),
                                                                                property.value.value.replace(/\/?$/, '/'));
                            } else if (property.key.type === 'Identifier' && property.key.name === 'paths' && property.value.type === 'ObjectExpression') {
                                property.value.properties.forEach(function (pathProperty) {
                                    if (pathProperty.value.type === 'Literal' && typeof pathProperty.value.value === 'string') {
                                        requireJsConfig.paths[pathProperty.key.name || pathProperty.key.value] = pathProperty.value.value;
                                    } else {
                                        assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({path: ...}) syntax: ' + escodegen.generate(pathProperty)));
                                    }
                                });
                            } else if (property.key.type === 'Identifier' && property.key.name === 'shim' && property.value.type === 'ObjectExpression') {
                                property.value.properties.forEach(function (shimProperty) {
                                    if (shimProperty.key.type !== 'Identifier') {
                                        assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: ...}) syntax: ' + escodegen.generate(shimProperty)));
                                        return;
                                    }
                                    var moduleName = shimProperty.key.name;
                                    if (shimProperty.value.type === 'ArrayExpression') {
                                        registerShimArray(moduleName, shimProperty.value, javaScript);
                                    } else if (shimProperty.value.type === 'ObjectExpression') {
                                        shimProperty.value.properties.forEach(function (shimKeyValueNode) {
                                            if (shimKeyValueNode.key.type === 'Identifier') {
                                                if (shimKeyValueNode.key.name === 'deps') {
                                                    if (shimKeyValueNode.value.type === 'ArrayExpression') {
                                                        registerShimArray(moduleName, shimKeyValueNode.value, javaScript);
                                                    } else {
                                                        assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: {deps: ...}}) syntax: ' + escodegen.generate(objAst)));
                                                    }
                                                } else {
                                                    requireJsConfig.shim[moduleName] = requireJsConfig.shim[moduleName] || {};
                                                    requireJsConfig.shim[moduleName][shimKeyValueNode.key.name] = esanimate.objectify(shimKeyValueNode.value);
                                                }
                                            }
                                        });
                                    } else {
                                        assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: ...}) syntax: ' + escodegen.generate(shimProperty)));
                                    }
                                });
                            }
                        });
                    };

                estraverse.traverse(javaScript.parseTree, {
                    enter: function (node) {
                        if (node.type === 'ExpressionStatement' &&
                            node.expression.type === 'CallExpression' &&
                            node.expression.callee.type === 'MemberExpression' &&
                            !node.expression.callee.computed &&
                            node.expression.callee.property.name === 'config' &&
                            node.expression.callee.object.type === 'Identifier' &&
                            node.expression.arguments.length > 0 &&
                            node.expression.arguments[0].type === 'ObjectExpression' &&
                            (node.expression.callee.object.name === 'require' || node.expression.callee.object.name === 'requirejs')) {
                            // require.config({})
                            requireJsConfig.foundConfig = true;
                            extractRequireJsConfig(node.expression.arguments[0]);
                        } else if (node.type === 'VariableDeclaration') {
                            node.declarations.forEach(function (declarator) {
                                if ((declarator.id.type === 'Identifier' && (declarator.id.name === 'require' || declarator.id.name === 'requirejs')) && declarator.init && declarator.init.type === 'ObjectExpression') {
                                    // var require = {}
                                    // var requirejs = {}
                                    requireJsConfig.foundConfig = true;
                                    extractRequireJsConfig(declarator.init);
                                }
                            });
                        } else if (node.type === 'AssignmentExpression' &&
                                   node.left.type === 'Identifier' &&
                                   node.operator === '=' &&
                                   node.right.type === 'ObjectExpression' &&
                                   (node.left.name === 'require' || node.left.name === 'requirejs')) {
                            // require = {}
                            // requirejs = {}
                            requireJsConfig.foundConfig = true;
                            extractRequireJsConfig(node.right);
                        } else if (node.type === 'AssignmentExpression' &&
                                   node.left.type === 'MemberExpression' &&
                                   !node.left.computed &&
                                   node.operator === '=' &&
                                   node.left.object.type === 'Identifier' &&
                                   node.left.object.name === 'window' &&
                                   (node.left.property.name === 'require' || node.left.property.name === 'requirejs') &&
                                   node.right.type === 'ObjectExpression') {
                            // window.require = {}
                            // window.requirejs = {}
                            requireJsConfig.foundConfig = true;
                            extractRequireJsConfig(node.right);
                        } else if (node.type === 'AssignmentExpression' &&
                                   node.left.type === 'MemberExpression' &&
                                   !node.left.computed &&
                                   node.left.object.type === 'Identifier' &&
                                   node.left.object.name === 'require' &&
                                   node.left.property.name === 'baseUrl' &&
                                   node.right.type === 'Literal' &&
                                   typeof node.right.value === 'string') {
                            // require.config.baseUrl = '...'
                            requireJsConfig.baseUrl = assetGraph.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''), node.right.value.replace(/\/?$/, '/'));
                        }
                    }
                });
            }
        };

        // Find config in all previously loaded JavaScript assets
        assetGraph.findAssets({ type: 'JavaScript' }).forEach(function (asset) {
            if (!requireJsConfig.foundConfig) {
                requireJsConfig.registerConfigInJavaScript(asset);
            }
        });

        // Run config detection on all new incoming JavaScript assets
        assetGraph.on('addAsset', function (asset) {
            if (asset.type === 'JavaScript' && !requireJsConfig.foundConfig) {
                if (requireJsConfig.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound) {
                    asset.keepUnpopulated = true;
                }
                if (asset.isLoaded) {
                    requireJsConfig.registerConfigInJavaScript(asset);
                } else {
                    asset.on('load', function () {
                        requireJsConfig.registerConfigInJavaScript(asset);
                    });
                }
            }
        });
    };
};

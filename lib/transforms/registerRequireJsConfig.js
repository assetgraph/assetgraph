var urlTools = require('urltools'),
    AssetGraph = require('../'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

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
                if (elementNode instanceof uglifyJs.AST_String) {
                    if (deps.indexOf(elementNode.value) === -1) {
                        deps.push(elementNode.value);
                    }
                } else {
                    assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: [...]}}) syntax: ' + arrayNode.print_to_string()));
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
                        objAst.properties.forEach(function (keyValueNode) {
                            if (keyValueNode.key === 'baseUrl' && keyValueNode.value instanceof uglifyJs.AST_String) {
                                requireJsConfig.baseUrl = assetGraph.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''),
                                                                                keyValueNode.value.value.replace(/\/?$/, '/'));
                            } else if (keyValueNode.key === 'paths' && keyValueNode.value instanceof uglifyJs.AST_Object) {
                                keyValueNode.value.properties.forEach(function (pathNode) {
                                    if (pathNode.value instanceof uglifyJs.AST_String) {
                                        requireJsConfig.paths[pathNode.key] = pathNode.value.value;
                                    } else {
                                        assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({path: ...}) syntax: ' + pathNode.print_to_string()));
                                    }
                                });
                            } else if (keyValueNode.key === 'shim' && keyValueNode.value instanceof uglifyJs.AST_Object) {
                                keyValueNode.value.properties.forEach(function (shimNode) {
                                    var moduleName = shimNode.key;
                                    if (shimNode.value instanceof uglifyJs.AST_Array) {
                                        registerShimArray(moduleName, shimNode.value, javaScript);
                                    } else if (shimNode.value instanceof uglifyJs.AST_Object) {
                                        shimNode.value.properties.forEach(function (shimKeyValueNode) {
                                            if (shimKeyValueNode.key === 'deps') {
                                                if (shimKeyValueNode.value instanceof uglifyJs.AST_Array) {
                                                    registerShimArray(moduleName, shimKeyValueNode.value, javaScript);
                                                } else {
                                                    assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: {deps: ...}}) syntax: ' + objAst.print_to_string()));
                                                }
                                            } else {
                                                requireJsConfig.shim[moduleName] = requireJsConfig.shim[moduleName] || {};
                                                requireJsConfig.shim[moduleName][shimKeyValueNode.key] = uglifyAst.astToObj(shimKeyValueNode.value);
                                            }
                                        });
                                    } else {
                                        assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: ...}) syntax: ' + shimNode.print_to_string()));
                                    }
                                });
                            }
                        });
                    };

                javaScript.parseTree.walk(new uglifyJs.TreeWalker(function (node) {
                    if (node instanceof uglifyJs.AST_SimpleStatement &&
                        node.body instanceof uglifyJs.AST_Call &&
                        node.body.expression instanceof uglifyJs.AST_Dot &&
                        node.body.expression.property === 'config' &&
                        node.body.expression.expression instanceof uglifyJs.AST_SymbolRef &&
                        node.body.args[0] instanceof uglifyJs.AST_Object &&
                        (node.body.expression.expression.name === 'require' || node.body.expression.expression.name === 'requirejs')) {
                        // require.config({})
                        requireJsConfig.foundConfig = true;
                        extractRequireJsConfig(node.body.args[0]);
                    } else if (node instanceof uglifyJs.AST_Var) {
                        node.definitions.forEach(function (varDefNode) {
                            if ((varDefNode.name.name === 'require' || varDefNode.name.name === 'requirejs') && varDefNode.value instanceof uglifyJs.AST_Object) {
                                // var require = {}
                                // var requirejs = {}
                                requireJsConfig.foundConfig = true;
                                extractRequireJsConfig(varDefNode.value);
                            }
                        });
                    } else if (node instanceof uglifyJs.AST_Assign &&
                               node.left instanceof uglifyJs.AST_SymbolRef &&
                               node.operator === '=' &&
                               node.right instanceof uglifyJs.AST_Object &&
                               (node.left.start.value === 'require' || node.left.start.value === 'requirejs')) {
                        // require = {}
                        // requirejs = {}
                        requireJsConfig.foundConfig = true;
                        extractRequireJsConfig(node.right);
                    } else if (node instanceof uglifyJs.AST_Assign &&
                               node.left instanceof uglifyJs.AST_Dot &&
                               node.left.expression instanceof uglifyJs.AST_SymbolRef &&
                               node.operator === '=' &&
                               node.left.expression.name === 'window' &&
                               (node.left.property === 'require' || node.left.property === 'requirejs') &&
                               node.right instanceof uglifyJs.AST_Object) {
                        // window.require = {}
                        // window.requirejs = {}
                        requireJsConfig.foundConfig = true;
                        extractRequireJsConfig(node.right);
                    } else if (node instanceof uglifyJs.AST_Assign &&
                               node.left instanceof uglifyJs.AST_Dot &&
                               node.left.expression instanceof uglifyJs.AST_SymbolRef &&
                               node.left.expression.name === 'require' &&
                               node.left.property === 'baseUrl' &&
                               node.right instanceof uglifyJs.AST_String) {
                        // require.config.baseUrl = '...'
                        requireJsConfig.baseUrl = assetGraph.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''), node.right.value.replace(/\/?$/, '/'));
                    }
                }));
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

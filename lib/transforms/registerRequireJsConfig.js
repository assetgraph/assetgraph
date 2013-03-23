var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    uglifyJs = require('uglify-js'),
    uglifyAst = require('uglifyast');

module.exports = function (options) {
    options = options || {};
    return function registerRequireJsConfig(assetGraph) {
        var requireJsConfig = (assetGraph.requireJsConfig = assetGraph.requireJsConfig || {});

        requireJsConfig.paths = requireJsConfig.paths || {};
        requireJsConfig.shim = {};
        requireJsConfig.foundConfig = false;
        requireJsConfig.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound = !!options.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound;
        requireJsConfig.resolveUrl = function (url, baseUrl) {
            baseUrl = baseUrl || this.baseUrl || '';
            var fragments = url.split('/'),
                lastFragment = fragments.pop(),
                matchLastFragment = lastFragment.match(/^(.*?)(\.[^\/\.]*)$/),
                lastFragmentExtension;

            if (matchLastFragment) {
                lastFragment = matchLastFragment[1];
                lastFragmentExtension = matchLastFragment[2];
            }
            fragments.push(lastFragment);

            for (var i = fragments.length ; i > 0 ; i -= 1) {
                var prefix = fragments.slice(0, i).join('/');
                if (prefix in this.paths) {
                    if (i === fragments.length) {
                        return urlTools.resolveUrl(baseUrl, this.paths[prefix] + '.js');
                    } else {
                        return urlTools.resolveUrl(baseUrl, urlTools.resolveUrl(this.paths[prefix].replace(/\/?$/, '/'), fragments.slice(i).join('/') + (lastFragmentExtension || '')));
                    }
                }
            }
            return urlTools.resolveUrl(baseUrl, url);
        };

        requireJsConfig.getModuleName = function (asset, fallbackBaseUrl) {
            var baseUrl = (requireJsConfig.baseUrl && requireJsConfig.baseUrl.replace(/\/$/, '')) || fallbackBaseUrl,
                modulePrefixByPath = {},
                modulePaths = [];

            // TODO: Cache the below
            Object.keys(requireJsConfig.paths).forEach(function (modulePrefix) {
                var modulePath = requireJsConfig.paths[modulePrefix].replace(baseUrl, "").replace(/\/$/, '');
                modulePrefixByPath[modulePath] = modulePrefix;
                modulePaths.push(modulePath);
            });
            var modulePathsOrderedByLengthDesc = modulePaths.sort(function (a, b) {
                return b.length - a.length;
            });

            if (asset.isInline) {
                return null;
            }
            var moduleName = urlTools.buildRelativeUrl(baseUrl, asset.url).replace(/\.js$/, "");
            for (var i = 0 ; i < modulePathsOrderedByLengthDesc.length ; i += 1) {
                var path = modulePathsOrderedByLengthDesc[i];
                if (moduleName.indexOf(path + "/") === 0) {
                    moduleName = moduleName.replace(path, modulePrefixByPath[path]);
                    break;
                }
            }
            return moduleName;
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

        requireJsConfig.registerConfigInJavaScript = function (javaScript, htmlAsset) {
            if (!htmlAsset) {
                var incomingRelationsFromHtml = assetGraph.findRelations({to: javaScript, from: {type: 'Html'}});
                if (incomingRelationsFromHtml.length > 0) {
                    htmlAsset = incomingRelationsFromHtml[0].from.nonInlineAncestor; // Could be a conditional comment.
                }
            }
            if (htmlAsset) {
                var htmlUrl = htmlAsset.url;
                function extractRequireJsConfig(objAst) {
                    objAst.properties.forEach(function (keyValueNode) {
                        if (keyValueNode.key === 'baseUrl' && keyValueNode.value instanceof uglifyJs.AST_String) {
                            var baseUrl = keyValueNode.value.value.replace(/\/?$/, '/'); // Ensure trailing slash
                            if (/^\//.test(baseUrl) && /^file:/.test(assetGraph.root) && /^file:/.test(htmlUrl)) {
                                baseUrl = urlTools.resolveUrl(assetGraph.root, baseUrl.replace(/^\//, ''));
                            } else {
                                baseUrl = urlTools.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''), baseUrl);
                            }
                            requireJsConfig.baseUrl = baseUrl;
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
                }

                javaScript.parseTree.body.forEach(function (topLevelStatement) {
                    if (topLevelStatement instanceof uglifyJs.AST_SimpleStatement &&
                        topLevelStatement.body instanceof uglifyJs.AST_Call &&
                        topLevelStatement.body.expression instanceof uglifyJs.AST_PropAccess &&
                        topLevelStatement.body.expression.property === 'config' &&
                        topLevelStatement.body.expression.expression instanceof uglifyJs.AST_SymbolRef &&
                        topLevelStatement.body.expression.expression.name === 'require') {

                        requireJsConfig.foundConfig = true;
                        extractRequireJsConfig(topLevelStatement.body.args[0]);
                    } else if (topLevelStatement instanceof uglifyJs.AST_Var) {
                        topLevelStatement.definitions.forEach(function (varDefNode) {
                            if (varDefNode.name.name === 'require' && varDefNode.value instanceof uglifyJs.AST_Object) {
                                requireJsConfig.foundConfig = true;
                                extractRequireJsConfig(varDefNode.value);
                            }
                        });
                    }
                });
            }
        };

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

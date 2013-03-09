var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    uglifyJs = require('uglify-js-papandreou'),
    uglifyAst = require('uglifyast');

module.exports = function (queryObj) {
    return function registerRequireJsConfig(assetGraph) {
        var requireJsConfig = (assetGraph.requireJsConfig = assetGraph.requireJsConfig || {});

        requireJsConfig.paths = requireJsConfig.paths || {};
        requireJsConfig.shim = {};
        requireJsConfig.resolveUrl = function (url) {
            var fragments = url.split('/');
            fragments[fragments.length - 1] = fragments[fragments.length - 1].replace(/\.js$/, '');
            for (var i = fragments.length ; i > 0 ; i -= 1) {
                var prefix = fragments.slice(0, i).join('/');
                if (prefix in this.paths) {
                    if (i === fragments.length) {
                        return this.paths[prefix] + '.js';
                    } else {
                        return urlTools.resolveUrl(this.paths[prefix], prefix);
                    }
                }
            }
            if (fragments && fragments[0] in this.paths) {
                return urlTools.resolveUrl(this.paths[fragments[0]], fragments.slice(i).join('/'));
            } else if ('baseUrl' in this) {
                return urlTools.resolveUrl(this.baseUrl, url);
            } else {
                return url;
            }
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
            arrayNode[1].forEach(function (elementNode) {
                if (elementNode[0] === 'string') {
                    if (deps.indexOf(elementNode[1]) === -1) {
                        deps.push(elementNode[1]);
                    }
                } else {
                    assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: [...]}}) syntax: ' + uglifyJs.uglify.gen_code(arrayNode)));
                    throw new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: [...]}}) syntax: ' + uglifyJs.uglify.gen_code(arrayNode));
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
                    objAst[1].forEach(function (keyValueNode) {
                        if (keyValueNode[0] === 'baseUrl' && keyValueNode[1][0] === 'string') {
                            var baseUrl = keyValueNode[1][1].replace(/\/?$/, '/'); // Ensure trailing slash
                            if (/^\//.test(baseUrl) && /^file:/.test(assetGraph.root) && /^file:/.test(htmlUrl)) {
                                baseUrl = urlTools.resolveUrl(assetGraph.root, baseUrl.replace(/^\//, ''));
                            } else {
                                baseUrl = urlTools.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''), baseUrl);
                            }
                            requireJsConfig.baseUrl = baseUrl;
                        } else if (keyValueNode[0] === 'paths' && keyValueNode[1][0] === 'object') {
                            keyValueNode[1][1].forEach(function (pathNode) {
                                if (pathNode[1][0] === 'string') {
                                    var pathUrl = urlTools.resolveUrl(requireJsConfig.baseUrl || htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''),
                                                                      pathNode[1][1]);
                                    requireJsConfig.paths[pathNode[0]] = pathUrl;
                                } else {
                                    assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({path: ...}) syntax: ' + uglifyJs.uglify.gen_code(pathNode)));
                                }
                            });
                        } else if (keyValueNode[0] === 'shim' && keyValueNode[1][0] === 'object') {
                            keyValueNode[1][1].forEach(function (shimNode) {
                                var moduleName = shimNode[0];
                                if (shimNode[1][0] === 'array') {
                                    registerShimArray(moduleName, shimNode[1], javaScript);
                                } else if (shimNode[1][0] === 'object') {
                                    shimNode[1][1].forEach(function (shimKeyValueNode) {
                                        if (shimKeyValueNode[0] === 'deps') {
                                            if (shimKeyValueNode[1][0] === 'array') {
                                                registerShimArray(moduleName, shimKeyValueNode[1], javaScript);
                                            } else {
                                                assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: {deps: ...}}) syntax: ' + uglifyJs.uglify.gen_code(objAst)));
                                                throw new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: {deps: ...}}) syntax: ' + uglifyJs.uglify.gen_code(objAst));
                                            }
                                        } else {
                                            requireJsConfig.shim[moduleName] = requireJsConfig.shim[moduleName] || {};
                                            requireJsConfig.shim[moduleName][shimKeyValueNode[0]] = uglifyAst.astToObj(shimKeyValueNode[1]);
                                        }
                                    });
                                } else {
                                    assetGraph.emit('warn', new Error(javaScript.urlOrDescription + ': Unsupported require.config({shim: ...}) syntax: ' + uglifyJs.uglify.gen_code(shimNode)));
                                }
                            });
                        }
                    });
                }

                javaScript.parseTree[1].forEach(function (topLevelStatement) {
                   if (topLevelStatement[0] === 'stat' && topLevelStatement[1][0] === 'call' &&
                        topLevelStatement[1][1][0] === 'dot' && topLevelStatement[1][1][1][0] === 'name' &&
                        topLevelStatement[1][1][1][1] === 'require' && topLevelStatement[1][1][2] === 'config' &&
                        topLevelStatement[1][2].length === 1 && topLevelStatement[1][2][0][0] === 'object') {

                        // ["stat",["call",["dot",["name","require"],"config"],[["object",[...]]]]]
                        extractRequireJsConfig(topLevelStatement[1][2][0]);
                    } else if (topLevelStatement[0] === 'var') {
                        topLevelStatement[1].forEach(function (node) {
                            if (node[0] === 'require' && node[1] && node[1][0] === 'object') {
                                // ["var",[["require",["object",[["foo",["num",1]]]]]]]
                                extractRequireJsConfig(node[1]);
                            }
                        });

                    }
                });
            }
        };

        assetGraph.on('addAsset', function (asset, htmlAsset) {
            if (asset.type === 'JavaScript') {
                if (asset.isLoaded) {
                    requireJsConfig.registerConfigInJavaScript(asset, htmlAsset);
                } else {
                    asset.on('load', function () {
                        requireJsConfig.registerConfigInJavaScript(asset);
                    });
                }
            }
        });
    };
};

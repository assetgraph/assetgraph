var _ = require('underscore'),
    urlTools = require('../util/urlTools');

module.exports = function (queryObj) {
    return function registerRequireJsConfig(assetGraph) {
        assetGraph.requireJsConfig = assetGraph.requireJsConfig || {};
        assetGraph.requireJsConfig.paths = assetGraph.requireJsConfig.paths || {};
        assetGraph.requireJsConfig.resolveUrl = function (url) {
            var fragments = url.indexOf('/') !== -1 && url.split('/');
            if (fragments && fragments.length > 1 && fragments[0] in this.paths) {
                return urlTools.resolveUrl(this.paths[fragments[0]], fragments.slice(1).join('/'));
            } else if ('baseUrl' in this) {
                return urlTools.resolveUrl(this.baseUrl, url);
            } else {
                return url;
            }
        };

        assetGraph.requireJsConfig.registerConfigInJavaScript = function (javaScript, htmlAsset) {
            if (!htmlAsset) {
                var incomingRelationsFromHtml = assetGraph.findRelations({to: javaScript, from: {type: 'Html'}});
                if (incomingRelationsFromHtml.length > 0) {
                    htmlAsset = incomingRelationsFromHtml[0].from;
                }
            }
            if (htmlAsset) {
                var htmlUrl = htmlAsset.nonInlineAncestor.url;

                function extractRequireJsConfig(objAst) {
                    objAst[1].forEach(function (keyValueNode) {
                        if (keyValueNode[0] === 'baseUrl' && keyValueNode[1][0] === 'string') {
                            var baseUrl = keyValueNode[1][1].replace(/\/?$/, '/'); // Ensure trailing slash
                            if (/^\//.test(baseUrl) && /^file:/.test(assetGraph.root) && /^file:/.test(htmlUrl)) {
                                baseUrl = urlTools.resolveUrl(assetGraph.root, baseUrl.replace(/^\//, ''));
                            } else {
                                baseUrl = urlTools.resolveUrl(htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''), baseUrl);
                            }

                            assetGraph.requireJsConfig.baseUrl = baseUrl;
                        }
                    });
                    objAst[1].forEach(function (keyValueNode) {
                        if (keyValueNode[0] === 'paths' && keyValueNode[1][0] === 'object') {
                            keyValueNode[1][1].forEach(function (pathNode) {
                                if (pathNode[1][0] === 'string') {
                                    var pathUrl = urlTools.resolveUrl(assetGraph.requireJsConfig.baseUrl || htmlUrl.replace(/[^\/]+([\?#].*)?$/, ''),
                                                                      pathNode[1][1]).replace(/\/?$/, '/');
                                    assetGraph.requireJsConfig.paths[pathNode[0]] = pathUrl;
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
            if (asset.type === 'JavaScript' && asset.isLoaded) {
                assetGraph.requireJsConfig.registerConfigInJavaScript(asset, htmlAsset);
            }
        });
    };
};

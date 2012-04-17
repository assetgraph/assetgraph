var _ = require('underscore'),
    urlTools = require('../util/urlTools');

module.exports = function (queryObj) {
    return function (assetGraph) {
        assetGraph.requireJsPaths = {};

        assetGraph.on('addAsset', function (asset) {
            if (asset.type === 'JavaScript' && asset.isLoaded) {
                var incomingRelationsFromHtml = assetGraph.findRelations({to: asset, from: {type: 'Html'}});
                if (incomingRelationsFromHtml.length > 0) {
                    var htmlAsset = incomingRelationsFromHtml[0].from;

                    function extractRequireJsConfig(objAst) {
                        objAst[1].forEach(function (keyValueNode) {
                            if (keyValueNode[0] === 'paths' && keyValueNode[1][0] === 'object') {
                                keyValueNode[1][1].forEach(function (pathNode) {
                                    if (pathNode[1][0] === 'string') {
                                        assetGraph.requireJsPaths[pathNode[0]] = urlTools.resolveUrl(htmlAsset.nonInlineAncestor.url.replace(/[^\/]+([\?#].*)?$/, ''),
                                                                                                     pathNode[1][1]).replace(/\/?$/, '/');
                                    }
                                });
                            }
                        });
                    }

                    asset.parseTree[1].forEach(function (topLevelStatement) {
                        if (topLevelStatement[0] === 'stat' && topLevelStatement[1][0] === 'call' &&
                            topLevelStatement[1][1][0] === 'dot' && topLevelStatement[1][1][1][0] === 'name' &&
                            topLevelStatement[1][1][1][1] === 'require' && topLevelStatement[1][1][2] === 'config' &&
                            topLevelStatement[1][2].length === 1 && topLevelStatement[1][2][0][0] === 'object') {

                            // ["stat",["call",["dot",["name","require"],"config"],[["object",[...]]]]]
                            extractRequireJsConfig(topLevelStatement[1][2][0]);
                        } else if (topLevelStatement[0] === 'var') {
                            topLevelStatement[1].forEach(function (node) {
                                if (node[0] === 'require' && node[1][0] === 'object') {
                                    // ["var",[["require",["object",[["foo",["num",1]]]]]]]
                                    extractRequireJsConfig(node[1]);
                                }
                            });

                        }
                    });
                }
            }
        });
    };
};

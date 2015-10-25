var AssetGraph = require('../');
var estraverse = require('estraverse');

module.exports = function () {
    return function serializeSourceMaps(assetGraph) {
        var potentiallyOrphanedAssetsById = {};

        assetGraph.findAssets({ type: 'JavaScript', isLoaded: true }).forEach(function (javaScript) {
            var nonInlineAncestorUrl = javaScript.nonInlineAncestor.url;
            var hasLocationInformationPointingAtADifferentSourceFile = false;
            estraverse.traverse(javaScript.parseTree, {
                enter: function (node) {
                    if (node.loc && node.loc.source !== nonInlineAncestorUrl) {
                        hasLocationInformationPointingAtADifferentSourceFile = true;
                        return this.break();
                    }
                }
            });

            if (!hasLocationInformationPointingAtADifferentSourceFile) {
                return;
            }
            assetGraph.findRelations({ from: javaScript, type: 'JavaScriptSourceMappingUrl' }).forEach(function (existingSourceMapRelation) {
                potentiallyOrphanedAssetsById[existingSourceMapRelation.to.id] = existingSourceMapRelation.to;
                existingSourceMapRelation.detach();
            });

            var sourceMap = new AssetGraph.SourceMap({
                url: javaScript.isInline ? null : javaScript.url + '.map'
            });
            assetGraph.addAsset(sourceMap);
            new AssetGraph.JavaScriptSourceMappingUrl({
                to: sourceMap
            }).attach(javaScript, 'last');

            javaScript.serializationOptions = javaScript.serializationOptions || {};
            var oldSourceMapSetting = javaScript.serializationOptions.sourceMap;
            javaScript.serializationOptions.sourceMap = true;

            if (javaScript._text) {
                delete javaScript._text;
            }
            /*jshint -W030 */
            javaScript.text;
            /*jshint +W030 */
            javaScript.serializationOptions.sourceMap = oldSourceMapSetting;
            sourceMap.parseTree = javaScript.sourceMap.toJSON();
        });

        // Clean up old source maps:
        Object.keys(potentiallyOrphanedAssetsById).forEach(function (id) {
            var sourceMap = potentiallyOrphanedAssetsById[id];
            if (sourceMap.incomingRelations.length === 0) {
                assetGraph.removeAsset(sourceMap);
            }
        });
    };
};

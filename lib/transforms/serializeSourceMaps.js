var AssetGraph = require('../');
var estraverse = require('estraverse');

module.exports = function () {
    return function serializeSourceMaps(assetGraph) {
        var potentiallyOrphanedAssetsById = {};

        assetGraph.findAssets({ type: 'JavaScript', isLoaded: true }).forEach(function (javaScript) {
            // For now, don't attempt to attach source maps to data-bind attributes:
            if (javaScript.isInline && assetGraph.findRelations({ type: [ 'HtmlDataBindAttribute', 'HtmlKnockoutContainerless' ], to: javaScript }).length > 0) {
                return;
            }

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

            javaScript.serializationOptions = javaScript.serializationOptions || {};
            var oldSourceMapSetting = javaScript.serializationOptions.sourceMap;
            javaScript.serializationOptions.sourceMap = true;

            if (javaScript._text) {
                javaScript._text = undefined;
            }
            /*jshint -W030 */
            javaScript.text;
            /*jshint +W030 */
            javaScript.serializationOptions.sourceMap = oldSourceMapSetting;
            var sourceMap = new AssetGraph.SourceMap({
                url: javaScript.isInline ? null : javaScript.url + '.map',
                parseTree: javaScript.sourceMap.toJSON()
            });
            new AssetGraph.JavaScriptSourceMappingUrl({
                to: sourceMap
            }).attach(javaScript, 'last');
            assetGraph.addAsset(sourceMap);
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

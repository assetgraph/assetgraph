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

            var sourceMap = new AssetGraph.SourceMap({
                url: javaScript.isInline ? null : javaScript.url + '.map',
                parseTree: javaScript.sourceMap
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

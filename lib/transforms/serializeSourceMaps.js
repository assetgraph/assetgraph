var AssetGraph = require('../');
var estraverse = require('estraverse');

module.exports = function () {
    return function serializeSourceMaps(assetGraph) {
        var potentiallyOrphanedAssetsById = {};

        assetGraph.findAssets({ type: [ 'Css', 'JavaScript' ], isLoaded: true }).forEach(function (asset) {
            // For now, don't attempt to attach source maps to data-bind attributes:
            if (asset.isInline && assetGraph.findRelations({ type: [ 'HtmlDataBindAttribute', 'HtmlKnockoutContainerless' ], to: asset }).length > 0) {
                return;
            }

            var nonInlineAncestorUrl = asset.nonInlineAncestor.url;
            if (asset.type === 'JavaScript') {
                var hasLocationInformationPointingAtADifferentSourceFile = false;
                estraverse.traverse(asset.parseTree, {
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
            }
            assetGraph.findRelations({ from: asset, type: /SourceMappingUrl$/ }).forEach(function (existingSourceMapRelation) {
                potentiallyOrphanedAssetsById[existingSourceMapRelation.to.id] = existingSourceMapRelation.to;
                existingSourceMapRelation.detach();
            });

            var sourceMap = new AssetGraph.SourceMap({
                url: asset.isInline ? null : asset.url + '.map',
                parseTree: asset.sourceMap
            });
            new AssetGraph[asset.type + 'SourceMappingUrl']({ to: sourceMap }).attach(asset, 'last');
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

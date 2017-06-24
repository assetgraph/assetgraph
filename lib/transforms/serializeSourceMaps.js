const AssetGraph = require('../AssetGraph');
const estraverse = require('estraverse');

module.exports = options => {
    options = options || {};
    return function serializeSourceMaps(assetGraph) {
        const potentiallyOrphanedAssetsById = {};

        for (const asset of assetGraph.findAssets({ type: [ 'Css', 'JavaScript' ], isLoaded: true })) {
            // For now, don't attempt to attach source maps to data-bind attributes etc.:
            if (asset.isInline && assetGraph.findRelations({ type: [ 'HtmlDataBindAttribute', 'HtmlKnockoutContainerless', 'HtmlParamsAttribute', 'HtmlStyleAttribute' ], to: asset }).length > 0) {
                continue;
            }

            const nonInlineAncestorUrl = asset.nonInlineAncestor.url;
            if (!asset.isDirty) {
                let hasLocationInformationPointingAtADifferentSourceFile = false;
                if (asset.type === 'JavaScript') {
                    estraverse.traverse(asset.parseTree, {
                        enter(node) {
                            if (node.loc && node.loc.source !== nonInlineAncestorUrl) {
                                hasLocationInformationPointingAtADifferentSourceFile = true;
                                return this.break();
                            }
                        }
                    });
                } else if (asset.type === 'Css') {
                    asset.parseTree.walk(node => {
                        if (node.source.input.file !== nonInlineAncestorUrl) {
                            hasLocationInformationPointingAtADifferentSourceFile = true;
                            return false;
                        }
                    });
                }

                if (!hasLocationInformationPointingAtADifferentSourceFile) {
                    continue;
                }
            }
            const sourcesContentByUrl = options.sourcesContent && {};
            for (const existingSourceMapRelation of assetGraph.findRelations({ from: asset, type: /SourceMappingUrl$/ })) {
                potentiallyOrphanedAssetsById[existingSourceMapRelation.to.id] = existingSourceMapRelation.to;
                const existingSourceMap = existingSourceMapRelation.to;
                if (options.sourcesContent && existingSourceMap.parseTree && existingSourceMap.parseTree.sourcesContent && existingSourceMap.parseTree.sources) {
                    for (let i = 0 ; i < existingSourceMap.parseTree.sources.length ; i += 1) {
                        if (typeof existingSourceMap.parseTree.sourcesContent[i] === 'string') {
                            const absoluteUrl = assetGraph.resolveUrl(existingSourceMap.nonInlineAncestor.url, existingSourceMap.parseTree.sources[i]);
                            sourcesContentByUrl[absoluteUrl] = existingSourceMap.parseTree.sourcesContent[i];
                        }
                    }
                }
                existingSourceMapRelation.detach();
            }

            const sourceMap = asset.sourceMap;
            if (options.sourcesContent) {
                sourceMap.sourcesContent = sourceMap.sources.map(url => sourcesContentByUrl[url] || null);
            } else {
                sourceMap.sourcesContent = undefined;
            }

            const sourceMapAsset = new AssetGraph.SourceMap({
                url: (asset.isInline ? nonInlineAncestorUrl && nonInlineAncestorUrl.replace(/\..*$/, '-') + asset.id : asset.url) + '.map',
                parseTree: sourceMap
            });
            assetGraph.addAsset(sourceMapAsset);
            const sourceMappingUrl = new AssetGraph[asset.type + 'SourceMappingUrl']({ to: sourceMapAsset }).attach(asset, 'last');
            // This is a(nother) case where it'd be nice if an inline relation could be yet another hrefType (#208), because
            // then the logical thing would be that attaching the sourceMappingUrl relation would automatically inline the asset:
            if (sourceMapAsset.isInline) {
                sourceMappingUrl.inline();
            }
        }

        // Clean up old source maps:
        for (const id of Object.keys(potentiallyOrphanedAssetsById)) {
            const asset = potentiallyOrphanedAssetsById[id];
            if (asset.incomingRelations.length === 0) {
                assetGraph.removeAsset(asset);
            }
        }
    };
};

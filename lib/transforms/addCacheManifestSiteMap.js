var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    assets = require('../assets'),
    relations = require('../relations'),
    query = require('../query');

module.exports = function (queryObj) {
    return function addCacheManifestSiteMap(assetGraph) {
        var allManifests = [],
            sharedManifest;
        assetGraph.findAssets(queryObj).forEach(function (htmlAsset) {
            var existingManifestRelations = assetGraph.findRelations({from: htmlAsset, type: 'HtmlCacheManifest'});
            if (existingManifestRelations.length > 1) {
                throw new Error("addCacheManifestSiteMap: Consistency error -- " + htmlAsset + " has more than one cache manifest relation");
            } else if (existingManifestRelations.length === 1) {
                if (allManifests.indexOf(existingManifestRelations[0].to) === -1) {
                    allManifests.push(existingManifestRelations[0].to);
                }
            } else {
                if (!sharedManifest) {
                    sharedManifest = new assets.CacheManifest({
                        isDirty: true,
                        parseTree: {}
                    });
                    sharedManifest.url = urlTools.resolveUrl(assetGraph.root, sharedManifest.id + sharedManifest.defaultExtension);
                    assetGraph.addAsset(sharedManifest);
                    allManifests.push(sharedManifest);
                }
                assetGraph.attachAndAddRelation(new relations.HtmlCacheManifest({
                    from: htmlAsset,
                    to: sharedManifest
                }), 'first');
            }
        });

        assetGraph.findAssets({isInline: false}).forEach(function (asset) {
            allManifests.forEach(function (manifest) {
                if (asset !== manifest && !assetGraph.findRelations({from: manifest, to: asset}).length) {
                    var existingManifestEntriesInCacheSection = assetGraph.findRelations({from: manifest, sectionName: 'CACHE'}),
                        position,
                        adjacentRelation;

                    if (existingManifestEntriesInCacheSection.length === 0) {
                        position = 'first';
                    } else {
                        position = 'after';
                        adjacentRelation = existingManifestEntriesInCacheSection[existingManifestEntriesInCacheSection.length - 1];
                    }

                    assetGraph.attachAndAddRelation(new relations.CacheManifestEntry({
                        sectionName: 'CACHE',
                        from: manifest,
                        to: asset
                    }), position, adjacentRelation);
                }
            });
        });
    };
};

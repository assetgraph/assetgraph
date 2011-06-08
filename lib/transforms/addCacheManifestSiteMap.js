var _ = require('underscore'),
    passError = require('../util/passError'),
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
                cb(new Error("addCacheManifestSiteMap: Consistency error -- " + htmlAsset + " has more than one cache manifest relation"));
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
                    sharedManifest.url = assetGraph.root + sharedManifest.id + sharedManifest.defaultExtension;
                    assetGraph.addAsset(sharedManifest);
                    allManifests.push(sharedManifest);
                }
                assetGraph.attachAndAddRelation(new relations.HtmlCacheManifest({
                    from: htmlAsset,
                    to: sharedManifest
                }));
            }
        });

        assetGraph.findAssets({url: query.isDefined}).forEach(function (asset) {
            allManifests.forEach(function (manifest) {
                if (asset !== manifest && !assetGraph.findRelations({from: manifest, to: asset}).length) {
                    assetGraph.attachAndAddRelation(new relations.CacheManifestEntry({
                        sectionName: 'CACHE',
                        from: manifest,
                        to: asset
                    }));
                }
            });
        });
    };
};

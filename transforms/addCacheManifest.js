var path = require('path'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    fileUtils = require('../fileUtils');

exports.addCacheManifest = function addCacheManifest(siteGraph, htmlAsset, cb) {
    // Remove any existing manifests for htmlAsset:
    siteGraph.relations.filter(function (relation) {
        return relation.from === htmlAsset && relation.type === 'HTMLCacheManifest';
    }).forEach(function (existingManifest) {
        siteGraph.detachAndUnregisterRelation(existingManifest);
    });

    var src = "CACHE MANIFEST\n" + htmlAsset.url + "\n";
    siteGraph.lookupSubgraph(htmlAsset, function (relation) {return true;}).assets.forEach(function (asset) {
        if (siteGraph.findRelations('to', asset).some(function (incomingRelation) {
            return !asset.isInline && 'url' in asset;
        })) {
            // At least one non-inline incoming relation, add to manifest:
            src += fileUtils.buildRelativeUrl(htmlAsset.url, asset.url) + "\n";
        }
    });
    htmlAsset.getParseTree(error.passToFunction(cb, function (parseTree) {
        // This is a little cumbersome:
        var manifestUrl = htmlAsset.url.replace(/\.[^\/]*$/, "") + '.manifest',
            cacheManifest = new assets.CacheManifest({
                url: manifestUrl,
                dirty: true,
                originalSrc: src
            });
        siteGraph.registerAsset(cacheManifest);
        var relation = new relations.HTMLCacheManifest({
            from: htmlAsset,
            to: cacheManifest
        });
        htmlAsset.attachRelation(relation, 'first');
        relation.setUrl(manifestUrl);
        htmlAsset.dirty = true;
        cb();
    }));
};

var step = require('step'),
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

// Will break the existing assets pretty badly, be careful!

exports.bundleAssets = function (queryObj) {
    if (!('type' in queryObj) || !/^(?:CSS|JavaScript)$/.test(queryObj.type)) {
        throw new Error("transforms.bundleAssets: queryObj must have a 'type' property of 'JavaScript' or 'CSS'");
    }

    return function bundleAssets(err, assetGraph, cb) {
        var assetsToBundle = assetGraph.findAssets(queryObj);
        if (assetsToBundle.length < 2) {
            process.nextTick(cb);
        } else {
            assetsToBundle.forEach(function (asset) {
                if (assetGraph.findRelations({to: asset}).length > 1) {
                    throw new Error("transforms.bundleAssets: Assets with more than one incoming relation cannot be bundled (yet)");
                }
            });
            assets[queryObj.type].makeBundle(assetsToBundle, function (err, bundleAsset) {
                bundleAsset.url = assetGraph.resolver.root + bundleAsset.id + '.' + bundleAsset.defaultExtension; // FIXME
                assetGraph.addAsset(bundleAsset);

                assetsToBundle.forEach(function (asset) {
                    // Attach the relations from the old assets to the bundle:
                    assetGraph.findRelations({from: asset}).forEach(function (outgoingRelation) {
                        assetGraph.removeRelation(outgoingRelation);
                        outgoingRelation.from = bundleAsset;
                        assetGraph.addRelation(outgoingRelation);
                    });
                });

                var incomingRelations = assetGraph.findRelations({to: assetsToBundle});
                if (incomingRelations.length > 0) {
                    assetGraph.attachAndAddRelation(new relations[incomingRelations[0].type]({
                        from: incomingRelations[0].from,
                        to: bundleAsset
                    }), 'before', incomingRelations[0]);
                    incomingRelations.forEach(function (relation) {
                        assetGraph.removeAsset(relation.to);
                        assetGraph.detachAndRemoveRelation(relation);
                    });
                }
                cb();
            });
        }
    };
};

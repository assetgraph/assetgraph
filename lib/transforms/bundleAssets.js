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

        function makeBundle(assetsToBundle, cb) {
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
                        assetGraph.detachAndRemoveRelation(relation);
                    });
                }

                assetsToBundle.forEach(function (asset) {
                    assetGraph.removeAsset(asset);
                });

                cb();
            });
        }

        var allAssets = assetGraph.findAssets(queryObj);
        if (allAssets.length < 2) {
            process.nextTick(cb);
        } else {
            // Divide the assets we're about to bundle into categories based on the set of including assets:
            var assetIncluderGroupings = {};
            allAssets.forEach(function (asset) {
                var incomingRelations = assetGraph.findRelations({to: asset}),
                    key = incomingRelations.map(function (incomingRelation) {
                        return incomingRelation.from.id;
                    }).join(",");
                // TODO: A warning should be emitted if the relations sets are ordered differently. It's almost
                // certainly an error on the programmer's part, and it'll lead to a subobtimal division of the
                // assets into bundles.
                (assetIncluderGroupings[key] = assetIncluderGroupings[key] || []).push(asset);
            });
            step(
                function () {
                    var group = this.group();
                    _.each(assetIncluderGroupings, function (assets, includersStr) {
                        if (assets.length > 1) {
                            makeBundle(assets, group());
                        }
                    });
                    process.nextTick(group());
                },
                cb
            );
        }
    };
};

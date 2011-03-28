var step = require('step'),
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

// Will break the existing assets pretty badly, be careful!

module.exports = function (queryObj) {
    if (!('type' in queryObj) || !/^(?:CSS|JavaScript)$/.test(queryObj.type)) {
        throw new Error("transforms.bundleAssets: queryObj must have a 'type' property of 'JavaScript' or 'CSS'");
    }
    if (!queryObj.incoming || !queryObj.incoming.type) {
        throw new Error("transforms.bundleAssets: queryObj must have an 'incoming' obj with a 'type' property");
    }

    return function bundleAssets(err, assetGraph, cb) {
        if (err) {
            throw err;
        }

        function makeBundle(assetsToBundle, cb) {
            assets[queryObj.type].makeBundle(assetsToBundle, function (err, bundleAsset) {
                bundleAsset.url = assetGraph.resolver.root + bundleAsset.id + '.' + bundleAsset.defaultExtension; // FIXME
                assetGraph.addAsset(bundleAsset);

                var outgoingRelations = assetGraph.findRelations({from: assetsToBundle});
                outgoingRelations.forEach(function (outgoingRelation) {
                    assetGraph.removeRelation(outgoingRelation);
                });

                var incomingRelations = assetGraph.findRelations({type: queryObj.incoming.type, to: assetsToBundle});
                if (incomingRelations.length > 0) {
                    assetGraph.attachAndAddRelation(new relations[queryObj.incoming.type]({
                        from: incomingRelations[0].from,
                        to: bundleAsset
                    }), 'before', incomingRelations[0]);
                    incomingRelations.forEach(function (relation) {
                        assetGraph.detachAndRemoveRelation(relation);
                    });
                }

                outgoingRelations.forEach(function (outgoingRelation) {
                    outgoingRelation.from = bundleAsset;
                    assetGraph.addRelation(outgoingRelation);
                });

                assetsToBundle.forEach(function (asset) {
                    if (assetGraph.findRelations({to: asset}).length === 0) {
                        assetGraph.removeAsset(asset);
                    }
                });

                process.nextTick(cb);
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
                // TODO: A warning should be emitted if the relation sets are ordered differently. It's almost
                // certainly an error on the programmer's part, and it'll lead to a suboptimal division of the
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
                error.passToFunction(cb, function () {
                    assetGraph.recomputeBaseAssets();
                    cb();
                })
            );
        }
    };
};

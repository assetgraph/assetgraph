var step = require('step'),
    _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

// Will break the existing assets pretty badly, be careful!

exports.bundleJavaScriptAndCSS = function () {
    return function bundleJavaScriptAndCSS(assetGraph, cb) {

        function bundleRelations(relationsToBundle, cb) {
            assets[relationsToBundle[0].to.type].makeBundle(_.pluck(relationsToBundle, 'to'), error.passToFunction(cb, function (bundleAsset) {
                bundleAsset.url = assetGraph.root + bundleAsset.id + '.' + bundleAsset.defaultExtension;
                assetGraph.registerAsset(bundleAsset);

                assetGraph.attachAndRegisterRelation(new relations[relationsToBundle[0].type]({
                    from: relationsToBundle[0].from,
                    to: bundleAsset
                }), 'before', relationsToBundle[0]);

                // Reregister the outgoing relations of the old assets to the bundle:

                relationsToBundle.forEach(function (relation) {
                    assetGraph.findRelations('from', relation.to).forEach(function (outgoingRelation) {
                        assetGraph.unregisterRelation(outgoingRelation);
                        outgoingRelation.from = bundleAsset;
                        assetGraph.registerRelation(outgoingRelation);
                    });
                    assetGraph.unregisterAsset(relation.to);
                    assetGraph.detachAndUnregisterRelation(relation);
                });
                process.nextTick(cb);
            }));
        }

        step(
            function () {
                ['HTMLScript', 'HTMLStyle'].forEach(function (relationType) {
                    var relationsOfType = assetGraph.relations.filter(function (relation) {
                        return relation.from.isInitial && relation.type === relationType; // Watch out
                    });
                    if (relationsOfType.length > 1) {
                        bundleRelations(relationsOfType, this.parallel());
                    }
                }, this);
                process.nextTick(this.parallel());
            },
            cb
        );
    };
};

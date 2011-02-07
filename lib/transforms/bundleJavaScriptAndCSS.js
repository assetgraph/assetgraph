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
                bundleAsset.url = assetGraph.root + bundleAsset.id + '.' + bundleAsset.defaultExtension; // FIXME
                assetGraph.addAsset(bundleAsset);

                assetGraph.attachAndAddRelation(new relations[relationsToBundle[0].type]({
                    from: relationsToBundle[0].from,
                    to: bundleAsset
                }), 'before', relationsToBundle[0]);

                // Readd the outgoing relations of the old assets to the bundle:

                relationsToBundle.forEach(function (relation) {
                    assetGraph.findRelations({from: relation.to}).forEach(function (outgoingRelation) {
                        assetGraph.removeRelation(outgoingRelation);
                        outgoingRelation.from = bundleAsset;
                        assetGraph.addRelation(outgoingRelation);
                    });
                    assetGraph.removeAsset(relation.to);
                    assetGraph.detachAndRemoveRelation(relation);
                });
                process.nextTick(cb);
            }));
        }

        step(
            function () {
                ['HTMLScript', 'HTMLStyle'].forEach(function (relationType) {
                    var relationsOfType = assetGraph.findRelations({type: relationType, from: {isInitial: true}});
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

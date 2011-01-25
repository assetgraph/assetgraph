var _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    step = require('step');

// Will break the existing assets pretty badly, be careful!

exports.bundleRelations = function bundleRelations(siteGraph, relationsToBundle, cb) {
    relationsToBundle = [].concat(relationsToBundle); // Otherwise things will break if relationsToBundle are the result of an index lookup
    assets[relationsToBundle[0].to.type].makeBundle(_.pluck(relationsToBundle, 'to'), error.passToFunction(cb, function (bundleAsset) {

        bundleAsset.url = _.extend(siteGraph.root); // FIXME
        siteGraph.registerAsset(bundleAsset);

        siteGraph.attachAndRegisterRelation(new relations[relationsToBundle[0].type]({
            from: relationsToBundle[0].from,
            to: bundleAsset
        }), 'before', relationsToBundle[0]);

        // Reregister the outgoing relations of the old assets to the bundle:

        relationsToBundle.forEach(function (relation) {
            [].concat(siteGraph.findRelations('from', relation.to)).forEach(function (outgoingRelation) {
                siteGraph.unregisterRelation(outgoingRelation);
                outgoingRelation.from = bundleAsset;
                siteGraph.registerRelation(outgoingRelation);
            });
            siteGraph.unregisterAsset(relation.to);
            siteGraph.unregisterRelation(relation);
        });
        cb(null, siteGraph);
    }));
};

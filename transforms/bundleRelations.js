var _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    step = require('step');

exports.bundleRelations = function bundleRelations(siteGraph, relationsToBundle, cb) {
    assets[relationsToBundle[0].to.type].makeBundle(_.pluck(relationsToBundle, 'to'), error.passToFunction(cb, function (bundleAsset) {
        siteGraph.registerAsset(bundleAsset);
        var bundleRelation = new relations[relationsToBundle[0].type]({
            from: relationsToBundle[0].from,
            to: bundleAsset
        });
        siteGraph.attachAndRegisterRelation(bundleRelation, 'before', relationsToBundle[0]);
        relationsToBundle.forEach(function (relation) {
            siteGraph.detachAndUnregisterRelation(relation);
        });
        cb();
    }));
};

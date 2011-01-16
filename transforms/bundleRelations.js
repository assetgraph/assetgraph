var _ = require('underscore'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations'),
    step = require('step');

// Will break the existing assets pretty badly, be careful!

exports.bundleRelations = function bundleRelations(siteGraph, relationsToBundle, cb) {
    assets[relationsToBundle[0].to.type].makeBundle(_.pluck(relationsToBundle, 'to'), error.passToFunction(cb, function (bundleAsset) {
        bundleAsset.baseUrl = relationsToBundle[0].from.baseUrl;
        siteGraph.registerAsset(bundleAsset);
        var bundleRelation = new relations[relationsToBundle[0].type]({
            from: relationsToBundle[0].from,
            to: bundleAsset
        });
        siteGraph.attachAndRegisterRelation(bundleRelation, 'before', relationsToBundle[0]);
        relationsToBundle.forEach(function (relation) {
            siteGraph.detachAndUnregisterRelation(relation);
            siteGraph.findRelations('from', relation.to).forEach(function (relrel) {
                siteGraph.unregisterRelation(relrel);
                relrel.from = bundleAsset;
                siteGraph.registerRelation(relrel);
            });
        });
        cb();
    }));
};

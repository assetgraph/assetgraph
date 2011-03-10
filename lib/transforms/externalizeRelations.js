var _ = require('underscore'),
    query = require('../query');

exports.externalizeRelations = function (queryObj) {
    return function externalizeRelations(err, assetGraph, cb) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            if (!relation.to.url) {
                assetGraph.setAssetUrl(relation.to, assetGraph.resolver.root + relation.to.id + '.' + relation.to.defaultExtension);
            }
        });
        process.nextTick(cb);
    };
};

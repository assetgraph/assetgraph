var _ = require('underscore'),
    seq = require('seq'),
    query = require('../query');

module.exports = function (queryObj) {
    return function externalizeRelations(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            if (!relation.to.url) {
                assetGraph.setAssetUrl(relation.to, assetGraph.resolver.root + relation.to.id + '.' + relation.to.defaultExtension);
            }
        });
        process.nextTick(cb);
    };
};

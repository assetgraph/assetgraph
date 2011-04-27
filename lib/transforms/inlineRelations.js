var seq = require('seq'),
    error = require('../error');

module.exports = function (queryObj) {
    return function inlineRelations(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findRelations(queryObj))
            .parEach(function (relation) {
                assetGraph.inlineRelation(relation, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

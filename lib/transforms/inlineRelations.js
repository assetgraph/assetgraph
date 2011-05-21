var seq = require('seq'),
    error = require('../util/error');

module.exports = function (queryObj) {
    return function inlineRelations(assetGraph, cb) {
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

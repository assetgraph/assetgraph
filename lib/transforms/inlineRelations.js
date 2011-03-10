var step = require('step'),
    error = require('../error');

exports.inlineRelations = function (queryObj) {
    return function inlineRelations(err, assetGraph, cb) {
        step(
            function () {
                assetGraph.findRelations(queryObj).forEach(function (relation) {
                    assetGraph.inlineAsset(relation.to, this.parallel());
                }, this);
                process.nextTick(this.parallel()); // In case of no matches
            },
            cb
        );
    };
};

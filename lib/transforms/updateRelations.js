var _ = require('lodash'),
    deepExtend = require('deep-extend');

module.exports = function (queryObj, properties, deep) {
    return function updateRelations(assetGraph) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            if (deep) {
                deepExtend(relation, properties);
            } else {
                _.extend(relation, properties);
            }
        });
    };
};

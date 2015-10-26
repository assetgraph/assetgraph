var _ = require('lodash'),
    deepExtend = require('deep-extend');

module.exports = function (queryObj, properties, options) {
    if (typeof options === 'boolean') {
        options = { deep: options };
    } else {
        options = options || {};
    }

    return function updateRelations(assetGraph) {
        assetGraph.findRelations(queryObj, options.includeUnresolved).forEach(function (relation) {
            if (options.deep) {
                deepExtend(relation, properties);
            } else {
                _.extend(relation, properties);
            }
        });
    };
};

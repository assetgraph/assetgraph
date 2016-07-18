var _ = require('lodash');

module.exports = function (queryObj, properties, options) {
    if (typeof options === 'boolean') {
        options = { deep: options };
    } else {
        options = options || {};
    }

    return function updateRelations(assetGraph) {
        assetGraph.findRelations(queryObj, options.includeUnresolved).forEach(function (relation) {
            if (options.deep) {
                _.merge(relation, properties);
            } else {
                _.extend(relation, properties);
            }
        });
    };
};

const _ = require('lodash');

module.exports = (queryObj, properties, options) => {
    if (typeof options === 'boolean') {
        options = { deep: options };
    } else {
        options = options || {};
    }

    return function updateRelations(assetGraph) {
        for (const relation of assetGraph.findRelations(queryObj, options.includeUnresolved)) {
            if (options.deep) {
                _.merge(relation, properties);
            } else {
                Object.assign(relation, properties);
            }
        }
    };
};

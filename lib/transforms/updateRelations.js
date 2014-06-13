var _ = require('underscore');

module.exports = function (queryObj, properties) {
    return function updateRelations(assetGraph) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            _.extend(relation, properties);
        });
    };
};

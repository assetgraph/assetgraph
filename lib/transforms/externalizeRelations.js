var urlTools = require('urltools');

module.exports = function (queryObj) {
    return function externalizeRelations(assetGraph) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            if (relation.to.isInline && relation.to.isExternalizable) {
                relation.to.url = urlTools.resolveUrl(assetGraph.root, relation.to.id + relation.to.extension);
            }
        });
    };
};

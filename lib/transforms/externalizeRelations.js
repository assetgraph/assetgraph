const urlTools = require('urltools');

module.exports = queryObj => {
    return function externalizeRelations(assetGraph) {
        for (const relation of assetGraph.findRelations(queryObj)) {
            if (relation.to.isInline && relation.to.isExternalizable) {
                // FIXME: Find a way to use the automatic url generation? Implement Asset#externalize?
                relation.to.url = urlTools.resolveUrl(assetGraph.root, relation.to.id + relation.to.extension);
            }
        }
    };
};

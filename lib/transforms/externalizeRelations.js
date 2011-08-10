var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    query = require('../query');

module.exports = function (queryObj) {
    return function externalizeRelations(assetGraph) {
        assetGraph.findRelations(queryObj).forEach(function (relation) {
            if (relation.to.isInline) {
                relation.to.url = urlTools.resolveUrl(assetGraph.root, relation.to.id + relation.to.extension);
            }
        });
    };
};

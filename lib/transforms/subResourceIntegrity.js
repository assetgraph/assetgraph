var crypto = require('crypto'),
    _ = require('lodash');

module.exports = function (relationsQuery) {
    relationsQuery = _.extend({ from: { isLoaded: true }}, relationsQuery);

    return function subResourceIntegrity(assetGraph, cb) {
        assetGraph
            .populate({
                followRelations: relationsQuery
            })
            .queue(function () {
                assetGraph.findRelations(relationsQuery).forEach(function (relation) {
                    if (relation.node) {
                        var hash = crypto.createHash('sha256').update(relation.to.rawSrc).digest('base64');
                        relation.node.setAttribute('integrity', 'ni:///sha256;' + hash + '?ct=' + relation.to.contentType);
                        relation.from.markDirty();
                    }
                });
            })
            .run(cb);
    };
};

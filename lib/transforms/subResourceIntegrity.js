var crypto = require('crypto');

module.exports = function (queryObj) {
    return function subResourceIntegrity(assetGraph, cb) {
        var sriQuery = {
            hrefType: 'absolute',
            from: {
                type: 'Html',
                isInline: false,
                isLoaded: true
            }
        };

        assetGraph
            .populate({
                followRelations: sriQuery
            })
            .queue(function () {
                assetGraph.findRelations(sriQuery).forEach(function (relation) {
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

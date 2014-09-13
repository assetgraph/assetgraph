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
                        relation.node.setAttribute('integrity', 'ni:///sha256;' + relation.to.sha256 + '?ct=' + relation.to.contentType);
                        relation.from.markDirty();
                    }
                });
            })
            .run(cb);
    };
};

var crypto = require('crypto'),
    query = require('../').query;

module.exports = function (relationsQuery) {

    return function subResourceIntegrity(assetGraph, cb) {
        relationsQuery = query.or({
                to: {
                    url: function (url) {
                        return url && url.indexOf(assetGraph.root) === 0;
                    }
                }
            },
            {
                type: query.not('HtmlAnchor'),
                from: query.or({
                    isInline: true
                },
                {
                    url: function (url) {
                        return url && url.indexOf(assetGraph.root) === 0;
                    }
                }),
                to: {
                    url: function (url) {
                        return url && url.indexOf(assetGraph.root) === -1;
                    }
                }
            });

        assetGraph
            .populate({
                followRelations: relationsQuery
            })
            .queue(function addIntegrityAttributes() {
                var externalAssets = {
                    isLoaded: true,
                    isInline: false,
                    type: query.not('Html'),
                    url: function (url) {
                        return url && url.indexOf(assetGraph.root) === -1;
                    }
                };

                assetGraph.findRelations({ to: externalAssets }).forEach(function (relation) {
                    if (relation.node) {
                        var hash = crypto.createHash('sha256').update(relation.to.rawSrc).digest('base64');
                        if (typeof relation.node.setAttribute === 'function') {
                            relation.node.setAttribute('integrity', 'ni:///sha256;' + hash + '?ct=' + relation.to.contentType);
                            relation.from.markDirty();
                        }
                    }
                });
            })
            .run(cb);
    };
};

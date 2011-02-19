var step = require('step'),
    error = require('../error');

exports.inlineAssets = function (query) {
    return function inlineAssets(assetGraph, cb) {
        step(
            function () {
                assetGraph.findAssets(query).forEach(function (asset) {
                    assetGraph.findRelations({to: asset}).forEach(function (relation) {
                        if (relation._inline) {
                            assetGraph.inlineRelation(relation, this.parallel());
                        } else {
                            console.log("transforms.inlineDirtyAssets: " + relation + " doesn't support inlining");
                        }
                    }, this);
                }, this);
                process.nextTick(this.parallel()); // In case of no matches
            },
            cb
        );
    };
};

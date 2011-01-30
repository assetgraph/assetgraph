var step = require('step'),
    error = require('../error');

exports.inlineDirtyAssets = function () {
    return function inlineDirtyAssets(assetGraph, cb) {
        step(
            function () {
                assetGraph.assets.filter(function (asset) {return asset.isDirty;}).forEach(function (dirtyAsset) {
                    assetGraph.findRelations('to', dirtyAsset).forEach(function (relation) {
                        if (relation._inline) {
                            assetGraph.inlineRelation(relation, this.parallel());
                        } else {
                            console.log("transforms.inlineDirtyAssets: " + relation + " doesn't support inlining");
                        }
                    }, this);
                    dirtyAsset.isDirty = false;
                }, this);
                process.nextTick(this.parallel()); // Just in case there're no dirty assets
            },
            cb
        );
    };
};

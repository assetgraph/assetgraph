var step = require('step'),
    error = require('../error');

exports.inlineDirtyAssets = function () {
    return function (siteGraph, cb) {
        step(
            function () {
                siteGraph.assets.filter(function (asset) {return asset.isDirty;}).forEach(function (dirtyAsset) {
                    siteGraph.findRelations('to', dirtyAsset).forEach(function (relation) {
                        if (relation._inline) {
                            siteGraph.inlineRelation(relation, this.parallel());
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

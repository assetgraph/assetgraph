var step = require('step'),
    error = require('../error');

exports.inlineAssets = function (assetLambda) {
    return function inlineAssets(assetGraph, cb) {
        step(
            function () {
                assetGraph.findAssets(assetLambda).forEach(function (asset) {
                    assetGraph.findRelations({to: asset}).forEach(function (relation) {
                        if (relation._inline) {
                            assetGraph.inlineRelation(relation, this.parallel());
                        } else {
                            console.log("transforms.inlineDirtyAssets: " + relation + " doesn't support inlining");
                        }
                    }, this);
                    // A leftover from back when this was called "inlineDirtyAssets". The 'isDirty' concept
                    // needs a bit of rethinking anyway:
                    if (asset.isDirty) {
                        asset.isDirty = false;
                    }
                }, this);
                process.nextTick(this.parallel()); // In case of no matches
            },
            cb
        );
    };
};

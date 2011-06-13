var _ = require('underscore');

// Traversal methods to be added to AssetGraph.prototype
module.exports = {
    eachAssetPostOrder: function (startAssetOrRelation, relationQueryObj, lambda) {
        var that = this;
        if (!lambda) {
            lambda = relationQueryObj;
            relationQueryObj = null;
        }
        var startAsset,
            startRelation;
        if (startAssetOrRelation.isRelation) {
            startRelation = startAssetOrRelation;
            startAsset = startRelation.to;
        } else {
            // incomingRelation will be undefined when lambda(startAsset) is called
            startAsset = startAssetOrRelation;
        }

        var seenAssets = {},
            stack = [];
        (function traverse(asset, incomingRelation) {
            if (!seenAssets[asset.id]) {
                seenAssets[asset.id] = true;
                stack.push(asset);
                that.findRelations(_.extend({from: asset}, relationQueryObj)).forEach(function (relation) {
                    traverse(relation.to, relation);
                });
                lambda(stack.pop(), incomingRelation);
            }
        }(startAsset, startRelation));
    },

    collectAssetsPostOrder: function (startAssetOrRelation, relationQueryObj) {
        var assetsInOrder = [];
        this.eachAssetPostOrder(startAssetOrRelation, relationQueryObj, function (asset) {
            assetsInOrder.push(asset);
        });
        return assetsInOrder;
    }
};

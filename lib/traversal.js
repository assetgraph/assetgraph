var _ = require('underscore'),
    traversal = {};

traversal.eachAssetPostOrder = function eachAssetPostOrder(assetGraph, startAssetOrRelation, relationQueryObj, lambda) {
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
            assetGraph.findRelations(_.extend({from: asset}, relationQueryObj)).forEach(function (relation) {
                traverse(relation.to, relation);
            });
            lambda(stack.pop(), incomingRelation);
        }
     }(startAsset, startRelation));
};

traversal.collectAssetsPostOrder = function collectAssetsPostOrder(assetGraph, startAssetOrRelation, relationQueryObj) {
    var assetsInOrder = [];
    traversal.eachAssetPostOrder(assetGraph, startAssetOrRelation, relationQueryObj, function (asset) {
        assetsInOrder.push(asset);
    });
    return assetsInOrder;
};

_.extend(exports, traversal);

var URL = require('url'),
    crypto = require('crypto'),
    step = require('step'),
    error = require('../error');

function findMoveOrderAssetBatches(siteGraph, cb) {
    var moveOrderBatches = [],
        clone = siteGraph.clone(),
        currentBatch;

    while (clone.assets.length) {
        currentBatch = [];
        [].concat(clone.assets).forEach(function (asset) {
            if (asset.isInitial) {
                clone.unregisterAsset(asset, true); // cascade
            } else if (!clone.findRelations('from', asset).length) {
                currentBatch.push(asset);
                clone.unregisterAsset(asset, true); // cascade
            }
        });

        if (currentBatch.length === 0) {
            throw new Error("Couldn't find a suitable move order, SiteGraph has cycles!");
        }
        moveOrderBatches.push(currentBatch);
    }
    return moveOrderBatches;
};

exports.moveAssetsToStaticDir = function moveAssets(staticDir) {
    return function (siteGraph, cb) {
        function moveAssetBatch(assetBatch, cb) {
            step(
                function () {
                    var group = this.group();
                    assetBatch.forEach(function (asset) {
                        if (asset.url) {
                            var callback = group();
                            asset.serialize(error.passToFunction(error.logAndExit(), function (src) {
                                var md5Prefix = crypto.createHash('md5').update(src).digest('hex').substr(0, 10);
                                siteGraph.setAssetUrl(asset, URL.resolve(siteGraph.root, staticDir + '/' + md5Prefix + '.' + asset.defaultExtension));
                                callback();
                            }));
                        }
                    }, this);
                    process.nextTick(group()); // Making sure we proceed to the next step
                },
                cb
            );
        }

        var moveOrderAssetBatches = findMoveOrderAssetBatches(siteGraph);

        function moveNextAssetBatch() {
            if (moveOrderAssetBatches.length) {
                moveAssetBatch(moveOrderAssetBatches.shift(), moveNextAssetBatch);
            } else {
                cb();
            }
        }
        moveNextAssetBatch();
    };
};

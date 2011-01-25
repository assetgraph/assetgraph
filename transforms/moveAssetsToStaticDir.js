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
            if (!clone.findRelations('from', asset).length) {
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

exports.moveAssetsToStaticDir = function moveAssets(siteGraph, staticDir, cb) {

    function moveAssetBatch(assetBatch, cb) {
        step(
            function () {
                var group = this.group();
                assetBatch.forEach(function (asset) {
                    if (asset.url) {
                        if (asset.type !== 'HTML') { // FIXME: Make configurable instead
                            var callback = group();
                            asset.serialize(error.passToFunction(error.logAndExit(), function (src) {
                                var md5Prefix = crypto.createHash('md5').update(src).digest('hex').substr(0, 10);
                                console.log("moving " + asset + " to " + URL.parse(URL.resolve(siteGraph.root, staticDir + '/' + md5Prefix + '.' + asset.defaultExtension)).href);
                                siteGraph.setAssetUrl(asset, URL.parse(URL.resolve(siteGraph.root, staticDir + '/' + md5Prefix + '.' + asset.defaultExtension)));
                                callback();
                            }));
                        }
                    }
                }, this);
                process.nextTick(group()); // Making sure we proceed to the next step
            },
            cb
        );
    }

    var moveOrderAssetBatches = findMoveOrderAssetBatches(siteGraph);

    function moveNextAssetBatch() {
console.log("move next batch!");
        if (moveOrderAssetBatches.length) {
            moveAssetBatch(moveOrderAssetBatches.shift(), moveNextAssetBatch);
        } else {
console.log("all done!");
            cb();
        }
    }
    moveNextAssetBatch();
};

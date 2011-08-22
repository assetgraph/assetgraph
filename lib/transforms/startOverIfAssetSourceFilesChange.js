var fs = require('fs'),
    urlTools = require('../util/urlTools'),
    query = require('../query');

module.exports = function (queryObj) {
    var watchedFilesByName = {},
        watchAssetMatcher = query.queryObjToMatcherFunction(queryObj),
        transforms = [],
        isFirstRun = true,
        isIdle = false,
        changedFilesByName = {};

    return function startOverIfAssetSourceFilesChange(assetGraph) {

        function rerunTransformsIfIdleAndFilesChanged () {
            var changedFileNames = Object.keys(changedFilesByName);
            if (isIdle && changedFileNames.length > 0) {
                console.warn("----------------------------------\nrestartIfAssetSourceFilesChange: Source files changed:\n  " + changedFileNames.join("\n  "));
                isIdle = false;
                changedFilesByName = {};
                assetGraph.findRelations().forEach(function (relation) {
                    assetGraph.removeRelation(relation);
                });
                assetGraph.findAssets().forEach(function (asset) {
                    assetGraph.removeAsset(asset);
                });
                assetGraph.queue(transforms).run();
            } else if (isIdle) {
                console.warn("transforms.restartIfAssetSourceFilesChange: Waiting...");
            }
        }

        assetGraph.on('addAsset', function (asset) {
            if (asset.url && /^file:/.test(asset.url)) {
                var fileName = urlTools.fileUrlToFsPath(asset.url);
                if (watchAssetMatcher(asset) && !(fileName in watchedFilesByName)) {
                    watchedFilesByName[fileName] = true;
                    fs.watchFile(fileName, function (currStat, prevStat) {
                        if (currStat.mtime.getTime() !== prevStat.mtime.getTime()) {
                            changedFilesByName[fileName] = true;
                            rerunTransformsIfIdleAndFilesChanged();
                        }
                    });
                }
            }
        }).on('beforeTransform', function (transform) {
            isIdle = false;
            if (isFirstRun) {
                transforms.push(transform);
            }
        }).on('idle', function () {
            isIdle = true;
            isFirstRun = false;
            rerunTransformsIfIdleAndFilesChanged();
        });
    };
};

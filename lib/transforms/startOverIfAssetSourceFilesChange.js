const fs = require('fs');
const urlTools = require('urltools');
const query = require('../query');

module.exports = queryObj => {
    const watchedFilesByName = {};
    const watchAssetMatcher = query.queryObjToMatcherFunction(queryObj);
    const transforms = [];
    let changedFilesByName = {};
    let isFirstRun = true;
    let isIdle = false;

    return function startOverIfAssetSourceFilesChange(assetGraph) {
        function rerunTransformsIfIdleAndFilesChanged() {
            const changedFileNames = Object.keys(changedFilesByName);
            if (isIdle && changedFileNames.length > 0) {
                console.warn('----------------------------------\nrestartIfAssetSourceFilesChange: Source files changed:\n  ' + changedFileNames.join('\n  '));
                isIdle = false;
                changedFilesByName = {};
                for (const relation of assetGraph.findRelations()) {
                    relation.from.removeRelation(relation);
                }
                for (const asset of assetGraph.findAssets()) {
                    assetGraph.removeAsset(asset);
                }
                assetGraph.queue(transforms).run();
            } else if (isIdle) {
                console.warn('transforms.restartIfAssetSourceFilesChange: Waiting...');
            }
        }

        assetGraph.on('addAsset', function (asset) {
            if (asset.url && /^file:/.test(asset.url)) {
                const fileName = urlTools.fileUrlToFsPath(asset.url);
                if (watchAssetMatcher(asset) && !watchedFilesByName[fileName]) {
                    watchedFilesByName[fileName] = true;
                    fs.watchFile(fileName, (currStat, prevStat) => {
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

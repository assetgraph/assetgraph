module.exports = queryObj => {
  return function writeAssetsToStdout(assetGraph) {
    for (const asset of assetGraph.findAssets(queryObj)) {
      process.stdout.write(asset.rawSrc);
    }
  };
};

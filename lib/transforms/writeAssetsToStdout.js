module.exports = () => {
  return function writeAssetsToStdout(assetGraph) {
    for (const asset of assetGraph.findAssets()) {
      process.stdout.write(asset.rawSrc);
    }
  };
};

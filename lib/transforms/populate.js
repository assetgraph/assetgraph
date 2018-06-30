const compileQuery = require('../compileQuery');

module.exports = ({
  concurrency = 100,
  stopAssets,
  followRelations,
  from,
  startAssets
} = {}) => {
  let stopAssetsMatcher = () => false;

  if (stopAssets) {
    stopAssetsMatcher = compileQuery(stopAssets);
  }
  return async function populate(assetGraph) {
    const followRelationsMatcher = compileQuery(
      followRelations || assetGraph.followRelations
    );
    const assetQueue = assetGraph.findAssets({
      isInline: false,
      isLoaded: true,
      ...(startAssets || from)
    });
    const seenAssets = new Set();

    async function processAsset(asset) {
      if (seenAssets.has(asset)) {
        return;
      }
      seenAssets.add(asset);
      try {
        await asset.load();
      } catch (err) {
        if (
          asset.incomingRelations.length > 0 &&
          asset.incomingRelations.every(relation =>
            /SourceMappingUrl$/.test(relation.type)
          )
        ) {
          assetGraph.info(err);
        } else {
          assetGraph.warn(err);
        }
        return;
      }
      for (const relation of asset.externalRelations) {
        if (relation.to && followRelationsMatcher(relation, assetGraph)) {
          if (!stopAssetsMatcher(relation.to)) {
            assetQueue.push(relation.to);
          }
        }
      }
    }

    while (assetQueue.length > 0) {
      await Promise.all(assetQueue.splice(0, concurrency).map(processAsset));
    }
  };
};

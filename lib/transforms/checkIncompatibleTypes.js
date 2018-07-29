const AssetGraph = require('../AssetGraph');
const isCompatibleWith = require('../util/isCompatibleWith');

function warnIncompatibleTypes(incompatibleTypes, asset, emittedWarnings) {
  const errorString = `Asset is used as both ${[...incompatibleTypes]
    .sort()
    .join(' and ')}`;
  if (!emittedWarnings.has(errorString)) {
    emittedWarnings.add(errorString);
    const err = new Error(errorString);
    err.asset = asset;
    asset.assetGraph.warn(err);
  }
}

module.exports = queryObj => {
  return function checkIncompatibleTypes(assetGraph) {
    for (const asset of assetGraph.findAssets(queryObj)) {
      const emittedWarnings = new Set();

      const types = asset.incomingRelations
        .map(r => r.targetType)
        .filter(t => t);

      const contentType =
        asset.location === undefined &&
        asset.hasOwnProperty('contentType') &&
        asset.contentType;

      const typeFromContentType =
        contentType && AssetGraph.typeByContentType[contentType];
      if (
        typeFromContentType &&
        asset.location === undefined &&
        !isCompatibleWith(asset, typeFromContentType)
      ) {
        const err = new Error(
          `Asset served with a Content-Type of ${contentType}, but used as ${
            asset.type
          }`
        );
        err.asset = asset;
        asset.assetGraph.warn(err);
      }

      let commonType;
      for (const type of types) {
        if (!commonType) {
          commonType = type;
        } else if (
          commonType !== type &&
          !AssetGraph[commonType].prototype[`is${type}`] &&
          !AssetGraph[type].prototype[`is${commonType}`]
        ) {
          warnIncompatibleTypes([commonType, type], asset, emittedWarnings);
          commonType = undefined;
          break;
        }
      }
      if (commonType) {
        if (
          asset._inferredType &&
          !AssetGraph[commonType].prototype[`is${asset._inferredType}`] &&
          !AssetGraph[asset._inferredType].prototype[`is${commonType}`]
        ) {
          warnIncompatibleTypes(
            [asset._inferredType, commonType],
            asset,
            emittedWarnings
          );
        } else {
          asset._inferredType = commonType;
        }
      }
      if (contentType === 'text/plain' && commonType && commonType !== 'Text') {
        // Don't allow an isText asset to pass as compatible with explicit text/plain
        const err = new Error(
          `Asset served with a Content-Type of ${contentType}, but used as ${commonType}`
        );
        err.asset = asset;
        asset.assetGraph.warn(err);
      }
    }
  };
};

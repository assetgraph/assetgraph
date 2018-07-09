const AssetGraph = require('../AssetGraph');
const isCompatibleWith = require('../util/isCompatibleWith');

function warnIncompatibleTypes(incompatibleTypes, asset) {
  const errorString = `Asset is used as both ${[...incompatibleTypes]
    .sort()
    .join(' and ')}`;
  const err = new Error(errorString);
  err.asset = asset;
  asset.assetGraph.warn(err);
}

module.exports = queryObj => {
  return assetGraph => {
    for (const asset of assetGraph.findAssets(queryObj)) {
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
        warnIncompatibleTypes([asset.type, typeFromContentType], asset);
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
          warnIncompatibleTypes([commonType, type], asset);
          commonType = undefined;
          break;
        }
      }
      if (commonType) {
        if (
          asset._inferredType &&
          !AssetGraph[commonType].prototype[`is${asset._inferredType}`]
        ) {
          warnIncompatibleTypes([asset._inferredType, commonType], asset);
        } else {
          asset._inferredType = commonType;
        }
      }
      if (contentType === 'text/plain' && commonType && commonType !== 'Text') {
        // Don't allow an isText asset to pass as compatible with explicit text/plain
        warnIncompatibleTypes([asset.type, commonType], asset);
      }
    }
  };
};

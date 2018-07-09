const AssetGraph = require('../AssetGraph');

function isCompatibleWith(asset, Class) {
  if (typeof Class === 'undefined') {
    Class = AssetGraph.Asset;
  } else if (typeof Class === 'string') {
    Class = AssetGraph[Class];
  }
  return (
    asset instanceof Class ||
    !asset._type ||
    Class.prototype instanceof AssetGraph[asset._type] ||
    !!(asset.isImage && Class === AssetGraph.Image) || // Svg is modelled as a subclass of Xml, not Image
    !!(asset.isImage && Class === AssetGraph.Font) // Svg can be used as a font as well
  );
}

module.exports = isCompatibleWith;

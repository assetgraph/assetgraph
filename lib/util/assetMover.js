/** @typedef {import('../assets/Asset')} Asset */
/** @typedef {import('../AssetGraph')} AssetGraph */

/**
 * @callback newUrlFunction
 * @param {Asset} asset
 * @param {AssetGraph} assetGraph
 * @returns {string} new URL
 */

/**
 * @param {string | newUrlFunction} newUrlFunctionOrString,
 * @param {AssetGraph} assetGraph
 */
module.exports = (newUrlFunctionOrString, assetGraph) => {
  if (typeof newUrlFunctionOrString === 'undefined') {
    throw new Error("'newUrlFunctionOrString' parameter is mandatory.");
  }

  /**
   * @param {Asset} asset
   */
  function assetMover(asset) {
    let newUrl =
      typeof newUrlFunctionOrString === 'function'
        ? newUrlFunctionOrString(asset, assetGraph)
        : String(newUrlFunctionOrString);
    if (newUrl) {
      // Keep the old file name, query string and fragment identifier if the new url ends in a slash:
      if (asset.url && /\/$/.test(newUrl)) {
        const matchOldFileNameQueryStringAndFragmentIdentifier = asset.url.match(
          /[^/]*(?:[?#].*)?$/
        );
        if (matchOldFileNameQueryStringAndFragmentIdentifier) {
          newUrl += matchOldFileNameQueryStringAndFragmentIdentifier[0];
        }
      }
      asset.url = newUrl;
    }
  }

  return assetMover;
};

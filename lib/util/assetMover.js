module.exports = (newUrlFunctionOrString, assetGraph) => {
  if (typeof newUrlFunctionOrString === 'undefined') {
    throw new Error("'newUrlFunctionOrString' parameter is mandatory.");
  }

  return asset => {
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
  };
};

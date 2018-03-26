// Inlines assets as data: urls
//
//   If the url of the image has an 'inline' GET parameter, it is inlined if the parameter has a true (or no) value, eg.: foo.png?inline or foo.png?inline=true
//   Otherwise the image will be inlined if the size of the image is less than or equal to 'options.sizeThreshold' AND the Css asset only has that one relation to the image

const defaultQueryObj = {
  isInline: false,
  query: { inline: value => value !== undefined }
};

module.exports = (queryObj, { minimumIeVersion = Infinity } = {}) => {
  if (queryObj) {
    queryObj = { $and: [queryObj, defaultQueryObj] };
  } else {
    queryObj = defaultQueryObj;
  }

  return function inlineAssetsPerQueryString(assetGraph) {
    const minimumIeVersionByAsset = new Map(); // Asset => minimumIeVersion
    function getMinimumIeVersionUsage(asset, stack = []) {
      if (asset.type === 'Html') {
        return 1;
      }
      if (minimumIeVersionByAsset.has(asset)) {
        return minimumIeVersionByAsset.get(asset);
      }
      stack.push(asset);
      const minimumIeVersion = Math.min(
        ...asset.incomingRelations
          .filter(incomingRelation => !stack.includes(incomingRelation.from))
          .map(incomingRelation => {
            let matchCondition;
            if (incomingRelation.type === 'HtmlConditionalComment') {
              matchCondition = incomingRelation.condition.match(
                /^(gte?|lte?)\s+IE\s+(\d+)$/i
              );
            } else if (
              incomingRelation.conditionalComments &&
              incomingRelation.conditionalComments.length > 0
            ) {
              matchCondition = incomingRelation.conditionalComments[0].nodeValue.match(
                /^\[if\s+(gte?|lte?)\s+IE\s+(\d+)\s*\]\s*>\s*<\s*!\s*$/i
              );
            }
            if (matchCondition) {
              if (matchCondition[1].substr(0, 2) === 'lt') {
                return 1;
              } else {
                return (
                  parseInt(matchCondition[2], 10) +
                  (matchCondition[1].toLowerCase() === 'gt' ? 1 : 0)
                );
              }
            } else {
              return getMinimumIeVersionUsage(incomingRelation.from, stack);
            }
          })
      );
      minimumIeVersionByAsset.set(asset, minimumIeVersion);
      return minimumIeVersion;
    }

    for (const asset of assetGraph.findAssets(queryObj)) {
      const inlineParamValue = asset.query.inline;
      if (!inlineParamValue || /^(?:true|on|yes|1)$/i.test(inlineParamValue)) {
        const assetUrl = asset.url;
        const minimumIeVersionUsage =
          minimumIeVersion !== Infinity && getMinimumIeVersionUsage(asset);
        for (const incomingRelation of asset.incomingRelations) {
          incomingRelation.inline();
          if (minimumIeVersion !== undefined) {
            if (minimumIeVersion <= 7 && minimumIeVersionUsage <= 7) {
              assetGraph.warn(
                new Error(
                  `Inlining ${assetUrl} causes the asset not to be parsed by IE7 and below`
                )
              );
            } else if (
              incomingRelation.href.length > 32768 &&
              minimumIeVersion <= 8 &&
              minimumIeVersionUsage <= 8
            ) {
              assetGraph.warn(
                new Error(
                  `Inlining ${assetUrl} causes the asset not to be parsed by IE8 and below because the data url is > 32 KB`
                )
              );
            }
          }
        }
      } else {
        try {
          delete asset.query.inline;
        } catch (err) {
          if (
            /already exists in the graph, cannot update url/.test(err.message)
          ) {
            // TODO: Let's find a way for the two, probably identical assets, to be merged
            // However, this is an edge case, and it doesn't really make sense to support ?inline=false
            // outside of inlineCssImagesWithLegacyFallback anyway
          } else {
            throw err;
          }
        }
      }
    }
  };
};

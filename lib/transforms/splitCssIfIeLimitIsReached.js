const postcss = require('postcss');
const Css = require('../assets/Css');

// http://blogs.msdn.com/b/ieinternals/archive/2011/05/14/internet-explorer-stylesheet-rule-selector-import-sheet-limit-maximum.aspx
module.exports = (
  queryObj,
  { minimumIeVersion = 1, rulesPerStylesheetLimit } = {}
) => {
  if (typeof rulesPerStylesheetLimit === 'undefined') {
    if (minimumIeVersion === null) {
      rulesPerStylesheetLimit = Infinity;
    } else if (minimumIeVersion <= 9) {
      rulesPerStylesheetLimit = 4095;
    } else {
      rulesPerStylesheetLimit = 65534;
    }
  }

  function countRules(node) {
    let count = 0;

    if (node.selector) {
      count += node.selector.split(',').length;
    }

    if (Array.isArray(node.nodes)) {
      // FIXME: Verify that this counting algorithm is identical to what IE does
      for (const childNode of node.nodes) {
        count += countRules(childNode);
      }
    }

    return count;
  }

  function splitStyleSheet(cssAsset) {
    const output = [];
    let accumulatedRules = 0;
    let offset = 0;

    for (const [i, rule] of cssAsset.parseTree.nodes.entries()) {
      const selectors = countRules(rule);

      if (accumulatedRules + selectors <= rulesPerStylesheetLimit) {
        accumulatedRules += selectors;
      } else {
        output.push({
          type: cssAsset.type,
          isPopulated: false,
          parseTree: postcss
            .root()
            .append(
              cssAsset.parseTree.nodes.slice(offset, i).map(Css.cloneWithRaws)
            )
        });

        offset = i;
        accumulatedRules = selectors;
      }
    }

    output.push({
      type: cssAsset.type,
      isPopulated: false,
      parseTree: postcss
        .root()
        .append(cssAsset.parseTree.nodes.slice(offset).map(Css.cloneWithRaws))
    });

    return output;
  }

  return function splitCssIfIeLimitIsReached(assetGraph) {
    if (rulesPerStylesheetLimit === Infinity) {
      return;
    }
    for (const largeAsset of assetGraph.findAssets(
      Object.assign({ type: 'Css', isLoaded: true }, queryObj)
    )) {
      const count = countRules(largeAsset.parseTree);
      let replacements;

      if (count > rulesPerStylesheetLimit) {
        replacements = splitStyleSheet(largeAsset);
        let info = new Error(
          `${count} CSS rules, ${count -
            rulesPerStylesheetLimit} would be ignored by IE9 and below. Splitting into ${
            replacements.length
          } chunks to resolve the problem.`
        );
        info.asset = largeAsset;
        assetGraph.info(info);

        // Add replacement css assets to the graph
        replacements = replacements.map((replacement, i) => {
          const asset = assetGraph.addAsset(replacement);

          if (!largeAsset.isInline) {
            asset.url = require('url').resolve(
              largeAsset.url,
              `${largeAsset.fileName.split('.').shift()}-${i}${
                largeAsset.extension
              }`
            );
          }

          assetGraph.addAsset(asset);

          return asset;
        });

        // Add relations to new replacement assets to the graph
        for (const oldRelation of largeAsset.incomingRelations) {
          for (const replacement of replacements) {
            oldRelation.from.addRelation(
              {
                type: oldRelation.type,
                hrefType: oldRelation.hrefType,
                to: replacement
              },
              'before',
              oldRelation
            );
          }
          oldRelation.detach();
        }

        // Remove all traces of the original to large Css asset
        // We're reusing the parseTree of largeAsset, so make sure that
        // the relations don't get detached from it as a side effect
        // of AssetGraph#removeAsset:
        largeAsset.outgoingRelations = [];
        assetGraph.removeAsset(largeAsset);
      }
    }
  };
};

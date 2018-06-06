const _ = require('lodash');
const postcss = require('postcss');
const assetGraphConditions = require('../assetGraphConditions');

module.exports = (
  queryObj,
  { strategyName = 'oneBundlePerIncludingAsset' } = {}
) => {
  return function bundleRelations(assetGraph) {
    function getDiscriminatorForRelation(relation) {
      const discriminatorFragments = [];
      discriminatorFragments.push(relation.type); // HtmlScript vs. JavaScriptImportScripts
      if (relation.to.isLoaded) {
        discriminatorFragments.push('isLoaded');
      }
      let isInsideHead = false;
      let parentNode = relation.node.parentNode;
      while (parentNode) {
        if (parentNode.nodeName.toLowerCase() === 'head') {
          isInsideHead = true;
          break;
        }
        parentNode = parentNode.parentNode;
      }
      if (isInsideHead) {
        discriminatorFragments.push('head');
      } else {
        discriminatorFragments.push('body');
      }
      if (relation.conditionalComments) {
        discriminatorFragments.push(
          ..._.map(relation.conditionalComments, 'nodeValue')
        );
      }
      if (
        relation.node &&
        relation.node.hasAttribute &&
        relation.node.hasAttribute('bundle')
      ) {
        discriminatorFragments.push(relation.node.getAttribute('bundle'));
      }
      if (relation.type === 'HtmlStyle') {
        discriminatorFragments.push(
          relation.node.getAttribute('media') || 'all'
        );
        for (const attribute of Array.from(relation.node.attributes)) {
          if (
            attribute.name !== 'charset' &&
            attribute.name !== 'media' &&
            attribute.name !== 'bundle' &&
            attribute.name !== 'nonce' && // CSP
            attribute.name !== 'data-assetgraph-conditions' &&
            (attribute.name !== 'rel' || attribute.value !== 'stylesheet') &&
            (attribute.name !== 'href' ||
              relation.node.nodeName.toLowerCase() !== 'link') &&
            (attribute.name !== 'type' ||
              attribute.value !== 'text/css' ||
              !relation.to ||
              relation.to.type !== 'Css')
          ) {
            return 'nobundle';
          }
        }
      } else if (relation.type === 'HtmlScript') {
        if (relation.to.strict) {
          discriminatorFragments.push('strict');
          const warning = new Error(
            'Global "use strict"-directive. Splitting into multiple bundles to avoid side effects.'
          );
          warning.asset = relation.to;
          assetGraph.info(warning);
        }
        if (relation.node.getAttribute('defer') === 'defer') {
          discriminatorFragments.push('defer');
        }
        if (relation.node.getAttribute('async') === 'async') {
          discriminatorFragments.push('async');
        }
        for (const attribute of Array.from(relation.node.attributes)) {
          if (
            attribute.name !== 'charset' &&
            attribute.name !== 'src' &&
            attribute.name !== 'bundle' &&
            attribute.name !== 'nonce' && // CSP
            attribute.name !== 'data-assetgraph-conditions' &&
            (attribute.name !== 'defer' || attribute.value !== 'defer') &&
            (attribute.name !== 'async' || attribute.value !== 'async') &&
            (attribute.name !== 'type' ||
              attribute.value !== 'text/javascript' ||
              !relation.to ||
              relation.to.type !== 'JavaScript')
          ) {
            return 'nobundle';
          }
        }
      }
      return discriminatorFragments.join(':');
    }

    // Reuses the parse trees of existing assets, so be careful!
    function makeBundle(assetsToBundle, incomingType) {
      if (assetsToBundle.length === 0) {
        throw new Error('makeBundle: Bundle must contain at least one asset');
      } else if (assetsToBundle.length === 1) {
        // Shortcut
        return [assetsToBundle[0]];
      }

      const type = assetsToBundle[0].type;
      let parseTree;
      if (type === 'JavaScript') {
        parseTree = { type: 'Program', body: [] };
        for (const asset of assetsToBundle) {
          // Append asset to new bundle
          parseTree.body.push(...asset.parseTree.body);
        }
      } else {
        // type === 'Css'
        parseTree = postcss.parse('');
        // Make sure that all @import rules go at the top of the bundle:
        const importRules = [];
        for (const asset of assetsToBundle) {
          const topLevelNodes = asset.parseTree.nodes;
          for (let i = 0; i < topLevelNodes.length; i += 1) {
            const topLevelNode = topLevelNodes[i];
            topLevelNode.parent = parseTree;
            if (
              topLevelNode.type === 'atrule' &&
              topLevelNode.name === 'import'
            ) {
              importRules.push(topLevelNode);
              topLevelNodes.splice(i, 1);
              i -= 1;
            }
          }
          parseTree.nodes.push(...topLevelNodes);
        }
        if (importRules.length > 0) {
          parseTree.nodes.unshift(...importRules);
        }
      }

      const bundleAsset = assetGraph.addAsset({
        type,
        parseTree,
        baseName: 'bundle',
        outgoingRelations: assetGraph.findRelations({
          from: { id: { $in: assetsToBundle.map(asset => asset.id) } }
        }),
        lastKnownByteLength: assetsToBundle.reduce(
          (sumOfLastKnownByteLengths, asset) => {
            return sumOfLastKnownByteLengths + asset.lastKnownByteLength;
          },
          0
        ),
        _toBeMinified: assetsToBundle.every(asset => asset._toBeMinified),
        isPretty: assetsToBundle.every(asset => asset.isPretty)
      });

      const seenReferringAssets = new Set();
      const incomingRelations = assetGraph.findRelations({
        type: incomingType,
        to: { id: { $in: assetsToBundle.map(asset => asset.id) } }
      });

      // Point at the bundled asset with a root-relative href if at least one of the relations
      // being bundled have a more specific hrefType than 'relative':
      const bundleRelationHrefType = incomingRelations.some(
        incomingRelation =>
          !['relative', 'inline'].includes(incomingRelation.hrefType)
      )
        ? 'rootRelative'
        : 'relative';

      const combinedAssetGraphConditions = {};
      // Reverse iteration for HtmlScript relations to ensure bundle insertion at tail end
      for (const incomingRelation of incomingType === 'HtmlScript'
        ? incomingRelations.slice().reverse()
        : incomingRelations) {
        if (!seenReferringAssets.has(incomingRelation.from)) {
          const bundleRelation = incomingRelation.from.addRelation(
            {
              type: incomingType,
              hrefType: bundleRelationHrefType,
              media: incomingRelation.media, // Only used for HtmlStyle
              async: incomingRelation.async, // Only used for HtmlScript
              defer: incomingRelation.defer, // Only used for HtmlScript
              to: bundleAsset
            },
            'before',
            incomingRelation
          );
          if (incomingRelation.from.type === 'Html') {
            let commonNonce;
            let nonceIsUnique = true;
            for (const relation of incomingRelations) {
              if (relation.from === incomingRelation.from) {
                if (relation.node.hasAttribute('nonce')) {
                  const nonce = relation.node.getAttribute('nonce');
                  if (typeof commonNonce === 'undefined') {
                    commonNonce = nonce;
                  } else if (commonNonce !== nonce) {
                    nonceIsUnique = false;
                  }
                }
              }
              const conditions = assetGraphConditions.parse(relation.node);
              if (conditions) {
                for (const conditionName of Object.keys(conditions)) {
                  if (
                    Array.isArray(combinedAssetGraphConditions[conditionName])
                  ) {
                    combinedAssetGraphConditions[conditionName].push(
                      conditions[conditionName]
                    );
                  } else {
                    combinedAssetGraphConditions[conditionName] = [
                      conditions[conditionName]
                    ];
                  }
                }
              }
            }
            if (typeof commonNonce !== 'undefined' && nonceIsUnique) {
              bundleRelation.node.setAttribute('nonce', commonNonce);
              bundleRelation.from.markDirty();
            }
            const conditionNames = Object.keys(combinedAssetGraphConditions);
            if (conditionNames.length > 0) {
              for (const conditionName of conditionNames) {
                const uniqueValues = _.uniq(
                  combinedAssetGraphConditions[conditionName]
                );
                if (uniqueValues.length === 1) {
                  combinedAssetGraphConditions[conditionName] = uniqueValues[0];
                } else {
                  combinedAssetGraphConditions[conditionName] = uniqueValues;
                }
              }
              bundleRelation.node.setAttribute(
                'data-assetgraph-conditions',
                assetGraphConditions.stringify(combinedAssetGraphConditions)
              );
            }
          }
          seenReferringAssets.add(incomingRelation.from);
        }
        incomingRelation.detach();
      }

      for (const outgoingRelation of assetGraph.findRelations({
        from: bundleAsset
      })) {
        outgoingRelation.refreshHref();
      }

      for (const asset of assetsToBundle) {
        if (
          assetGraph.findRelations({
            to: asset,
            type: { $not: 'SourceMapFile' }
          }).length === 0
        ) {
          for (const sourceMapFileRelation of assetGraph.findRelations({
            to: asset,
            type: 'SourceMapFile'
          })) {
            sourceMapFileRelation.remove();
          }
          assetGraph.removeAsset(asset);
        }
      }
      return bundleAsset;
    }

    const bundleStrategyByName = {};

    // Quick and dirty bundling strategy that gets you down to one <script> and one <link rel='stylesheet'>
    // per document, but doesn't do any cross-page optimization.
    bundleStrategyByName.oneBundlePerIncludingAsset = () => {
      const bundleAssets = [];
      const relationsByIncludingAsset = {};

      for (const relation of assetGraph.findRelations(queryObj)) {
        (relationsByIncludingAsset[relation.from.id] =
          relationsByIncludingAsset[relation.from.id] || []).push(relation);
      }

      for (const includingAssetId of Object.keys(relationsByIncludingAsset)) {
        const relationsToBundle = relationsByIncludingAsset[includingAssetId];

        for (const relationType of _.uniq(_.map(relationsToBundle, 'type'))) {
          let currentBundle = [];
          let bundleDiscriminator;
          const relationsOfTypeToBundle = relationsToBundle.filter(
            relation => relation.type === relationType
          );

          /* eslint-disable no-inner-declarations */
          function flushBundle() {
            if (currentBundle.length > 0) {
              bundleAssets.push(makeBundle(currentBundle, relationType));
              currentBundle = [];
            }
          }
          for (const outgoingRelation of assetGraph.findRelations({
            type: { $in: [relationType, 'HtmlConditionalComment'] }
          })) {
            if (outgoingRelation.type === 'HtmlConditionalComment') {
              if (
                assetGraph.findRelations({
                  from: outgoingRelation.to,
                  type: relationType
                }).length > 0
              ) {
                flushBundle();
              }
            } else if (relationsOfTypeToBundle.includes(outgoingRelation)) {
              // Make sure that we don't bundle HtmlStyles with different media attributes together etc.:
              const discriminator = getDiscriminatorForRelation(
                outgoingRelation
              );
              if (
                bundleDiscriminator &&
                (discriminator === 'nobundle' ||
                  bundleDiscriminator === 'nobundle' ||
                  discriminator !== bundleDiscriminator)
              ) {
                flushBundle();
              }
              bundleDiscriminator = discriminator;
              if (
                assetGraph.findRelations({
                  to: outgoingRelation.to,
                  type: { $not: 'SourceMapFile' }
                }).length > 1
              ) {
                currentBundle.push(outgoingRelation.to.clone(outgoingRelation));
              } else {
                currentBundle.push(outgoingRelation.to);
              }
            } else {
              flushBundle();
            }
          }
          flushBundle();
        }
      }
      return bundleAssets;
    };

    // Cross-page optimizing bundling strategy that never puts the same chunk in multiple bundles, but still tries
    // to create as few bundles as possible. Also preserves inclusion order.
    bundleStrategyByName.sharedBundles = () => {
      const assetIndex = {};
      const seenIncludingAssets = {};
      const bundles = [];
      const relationsByIncludingAsset = {};

      for (const relation of assetGraph.findRelations(queryObj)) {
        assetIndex[relation.to.id] = null; // Means not in a bundle yet
        seenIncludingAssets[relation.from.id] = relation.from;
        (relationsByIncludingAsset[relation.from.id] =
          relationsByIncludingAsset[relation.from.id] || []).push(relation);
      }

      function splitBundle(bundle, index) {
        const newBundle = bundle.splice(index);
        newBundle._relationType = bundle._relationType;
        for (const asset of newBundle) {
          assetIndex[asset.id] = newBundle;
        }
        if (newBundle.length > 0) {
          bundles.push(newBundle);
        }
        return newBundle;
      }

      for (const includingAsset of _.values(seenIncludingAssets)) {
        const relationsToBundle = relationsByIncludingAsset[includingAsset.id];

        for (const relationType of _.uniq(_.map(relationsToBundle, 'type'))) {
          const outgoingRelations = assetGraph.findRelations({
            from: includingAsset,
            type: { $in: [relationType, 'HtmlConditionalComment'] }
          });
          let previousBundle;
          let bundleDiscriminator;
          let canAppendToPreviousBundle = false;
          let previousBundleIndex;

          for (const outgoingRelation of outgoingRelations) {
            if (outgoingRelation.type === 'HtmlConditionalComment') {
              if (
                assetGraph.findRelations({
                  from: outgoingRelation.to,
                  type: relationType
                }).length > 0
              ) {
                canAppendToPreviousBundle = false;
              }
              continue;
            }

            // Make sure that we don't bundle HtmlStyles with different media attributes together etc.:
            const discriminator = getDiscriminatorForRelation(outgoingRelation);
            if (
              bundleDiscriminator &&
              (discriminator === 'nobundle' ||
                bundleDiscriminator === 'nobundle' ||
                discriminator !== bundleDiscriminator)
            ) {
              canAppendToPreviousBundle = false;
            }
            bundleDiscriminator = discriminator;

            let existingBundle = assetIndex[outgoingRelation.to.id];
            if (existingBundle === null) {
              // Not bundled yet, append to previousBundle if possible, else create a new one
              if (canAppendToPreviousBundle) {
                previousBundle.push(outgoingRelation.to);
                previousBundleIndex = previousBundle.length - 1;
              } else {
                if (
                  previousBundle &&
                  previousBundleIndex !== previousBundle.length - 1
                ) {
                  splitBundle(previousBundle, previousBundleIndex + 1);
                }
                previousBundle = [outgoingRelation.to];
                previousBundle._relationType = relationType;
                previousBundleIndex = 0;
                bundles.push(previousBundle);
                canAppendToPreviousBundle = true;
              }
              assetIndex[outgoingRelation.to.id] = previousBundle;
            } else if (existingBundle) {
              // Already in another bundle
              canAppendToPreviousBundle = false;
              let indexInExistingBundle = existingBundle.indexOf(
                outgoingRelation.to
              );
              if (previousBundle && existingBundle === previousBundle) {
                if (indexInExistingBundle === previousBundleIndex + 1) {
                  previousBundleIndex = indexInExistingBundle;
                } else {
                  splitBundle(previousBundle, indexInExistingBundle + 1);
                  existingBundle = assetIndex[outgoingRelation.to.id];
                  indexInExistingBundle = existingBundle.indexOf(
                    outgoingRelation.to
                  );
                  if (indexInExistingBundle !== 0) {
                    existingBundle = splitBundle(
                      existingBundle,
                      indexInExistingBundle
                    );
                  }
                  previousBundle = existingBundle;
                  previousBundleIndex = 0;
                }
              } else {
                if (
                  previousBundle &&
                  previousBundleIndex !== previousBundle.length - 1
                ) {
                  splitBundle(previousBundle, previousBundleIndex + 1);
                }
                if (indexInExistingBundle !== 0) {
                  existingBundle = splitBundle(
                    existingBundle,
                    indexInExistingBundle
                  );
                }
                previousBundle = existingBundle;
                previousBundleIndex = 0;
              }
            } else {
              // The relation doesn't point at an asset matched by queryObj
              previousBundle = null;
              canAppendToPreviousBundle = false;
            }
          }
          // No more outgoing relations for this asset, make sure that the asset that was bundled
          // last is at the last position in its bundle:
          if (
            previousBundle &&
            previousBundleIndex !== previousBundle.length - 1
          ) {
            splitBundle(previousBundle, previousBundleIndex + 1);
          }
        }
      }

      return bundles.map(bundle => makeBundle(bundle, bundle._relationType));
    };

    for (const bundleAsset of bundleStrategyByName[strategyName]()) {
      for (const incomingRelation of assetGraph.findRelations({
        to: bundleAsset
      })) {
        incomingRelation.refreshHref();
      }
      for (const outgoingRelation of assetGraph.findRelations({
        from: bundleAsset
      })) {
        outgoingRelation.refreshHref();
      }
    }
  };
};

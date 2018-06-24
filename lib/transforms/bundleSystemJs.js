/*jshint unused:false*/
const _ = require('lodash');
const Promise = require('bluebird');
const esanimate = require('esanimate');
const estraverse = require('estraverse-fb');
const urlTools = require('urltools');
const assetGraphConditions = require('../assetGraphConditions');

function extractSystemJsConfig(incomingRelations) {
  // HtmlScript, HtmlServiceWorkerRegistration, JavaScriptServiceWorkerRegistration, JavaScriptWebWorker, and JavaScriptImportScripts
  const systemJsConfig = {
    configStatements: [],
    topLevelSystemImportCalls: []
  };
  for (const relation of incomingRelations) {
    let seenConfig = false;
    let seenImport = false;
    estraverse.traverse(relation.to.parseTree, {
      enter(node, parentNode) {
        if (
          node.type === 'CallExpression' &&
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          (node.callee.object.name === 'System' ||
            node.callee.object.name === 'SystemJS') &&
          node.callee.property.type === 'Identifier' &&
          node.arguments.length === 1
        ) {
          if (node.callee.property.name === 'config') {
            seenConfig = true;
            const parentNodes = this.parents();
            systemJsConfig.configStatements.push({
              asset: relation.to,
              node,
              parentNode:
                parentNode.type === 'SequenceExpression'
                  ? parentNodes[parentNodes.length - 1]
                  : parentNodes[parentNodes.length - 2],
              detachableNode:
                parentNode.type === 'SequenceExpression'
                  ? node
                  : parentNodes[parentNodes.length - 1]
            });
          } else if (node.callee.property.name === 'import') {
            seenImport = true;
            systemJsConfig.topLevelSystemImportCalls.push({
              argumentString: node.arguments[0].value,
              asset: relation.to,
              node
            });
          }
        }
      }
    });
    if (seenConfig && seenImport) {
      throw new Error(
        'Please do not use both System.config and System.import in the same script as it will cause the generated bundle to be injected in the wrong place.'
      );
    }
  }
  return systemJsConfig;
}

// meta, packages deep
function getSharedProperties(configA, configB) {
  const bKeys = Object.keys(configB);
  return Object.keys(configA).filter(p => bKeys.includes(p));
}

function arrayEquals(arrayA, arrayB) {
  // TODO! DO this properly
  return JSON.stringify(arrayA.sort()) === JSON.stringify(arrayB.sort());
}

function detectObjectConflict(objA, objB) {
  if (!objA || !objB) {
    return false;
  }
  return getSharedProperties(objA, objB).some(prop => {
    const valueA = objA[prop];
    const valueB = objB[prop];
    if (valueA instanceof Array && valueB instanceof Array) {
      return !arrayEquals(valueA, valueB);
    } else if (typeof valueA === 'object' || typeof valueB === 'object') {
      // separate properties are always conflicts at this level
      return true;
    } else {
      return valueA !== valueB;
    }
  });
}

function detectMetaConflict(metaA, metaB) {
  if (!metaA || !metaB) {
    return false;
  }
  return getSharedProperties(metaA, metaB).some(prop => {
    const valueA = metaA[prop];
    const valueB = metaB[prop];

    // ensure both arrays (which would concat in conflict scenario)
    if (Array.isArray(valueA) || Array.isArray(valueB)) {
      return (
        !(Array.isArray(valueA) && Array.isArray(valueB)) ||
        !arrayEquals(valueA, valueB)
      );
    } else if (typeof valueA === 'object' || typeof valueB === 'object') {
      // ensure objects don't conflict
      return (
        !(typeof valueA === 'object' && typeof valueB === 'object') ||
        detectObjectConflict(valueA, valueB)
      );
    } else {
      return valueA !== valueB;
    }
  });
}

function detectSystemJSConflict(configA, configB) {
  if (
    ['pluginFirst', 'defaultJSExtensions'].some(value => {
      if (
        typeof configA[value] !== 'undefined' &&
        typeof configB[value] !== 'undefined'
      ) {
        return configA[value] !== configB[value];
      }
    })
  ) {
    return true;
  }
  if (
    typeof configA.packageConfigPaths !== 'undefined' &&
    typeof configB.packageConfigPaths !== 'undefined'
  ) {
    return !arrayEquals(configA.packageConfigPaths, configB.packageConfigPaths);
  }

  if (
    ['map', 'paths', 'bundles', 'depCache'].some(value => {
      return detectObjectConflict(configA[value], configB[value]);
    })
  ) {
    return true;
  }

  if (
    ['meta', 'babelOptions', 'traceurOptions'].some(value => {
      return detectMetaConflict(configA[value], configB[value]);
    })
  ) {
    return true;
  }

  if (configA.packages && configB.packages) {
    if (
      getSharedProperties(configA.packages, configB.packages).some(pkgName => {
        const packageA = configA.packages[pkgName];
        const packageB = configB.packages[pkgName];
        if (
          ['main', 'format', 'defaultExtension', 'basePath'].some(value => {
            return packageA[value] !== packageB[value];
          })
        ) {
          return true;
        }

        if (
          ['map', 'depCache'].some(value => {
            return detectObjectConflict(packageA[value], packageB[value]);
          })
        ) {
          return true;
        }

        if (packageA.modules && packageB.modules) {
          if (detectMetaConflict(packageA.modules, packageB.modules)) {
            return true;
          }
        }
      })
    ) {
      return true;
    }
  }
  return false;
}

/*
 * Bundling Strategy
 *
 * Creates a 'common' bundle, containing the shared dependencies between every entry point
 * If there are no common dependencies, only individual bundles are created
 *
 * If an entry point has a "deferredParent" that means that this is a deferred
 * non-critical load, within the given parent entry point
 * The entry point then does not form part of the common bundle
 * and the entry point is built based on the assumption of the parent it is contained in it
 *
 * When setting options.deferredImports to true, these are traced
 * and automatically included as deferred entry points.
 *
 * When manual bundles are included as options.manualBundles, these will be automatically excluded
 *
 * options.conditions allows the condition trace to be set, as the standard SystemJS
 * builder conditions object for tracing.
 * Any remaining conditional variation will then be iterated through all conditional combinations
 * per individual entry point providing the entry point "conditions" variations of the output
 */
async function bundleStrategy(builder, entryPoints, options) {
  // output
  const bundles = {};

  // we inline conditions that are singular in passed options
  const inlineConditions = {};
  if (options.conditions) {
    for (const condition of Object.keys(options.conditions)) {
      const val = options.conditions[condition];
      if (typeof val === 'string') {
        inlineConditions[condition] = val;
      } else if (Array.isArray(val) && val.length === 1) {
        inlineConditions[condition] = options.conditions[condition][0];
      }
    }
  }

  entryPoints = [...entryPoints];

  // disable plugin asset inlining as asset graph will handle this itself
  if (typeof options.inlinePlugins === 'undefined') {
    options.inlinePlugins = false;
  }

  if (typeof options.sourceMaps === 'undefined') {
    options.sourceMaps = false;
  }
  // simple random bundle name generation
  // with duplication avoidance
  function generateBundleName(name, modules, conditionValueOrVariationObject) {
    // first check if the given modules already matches an existing bundle
    let existingBundleName;
    for (const bundleName of Object.keys(bundles)) {
      const bundleModules = bundles[bundleName].modules;

      if (
        containsModules(modules, bundleModules) &&
        containsModules(bundleModules, modules)
      ) {
        existingBundleName = bundleName;
      }
    }
    if (existingBundleName) {
      return existingBundleName;
    }

    let shortName = name.split('/').pop();
    const dotIndex = shortName.lastIndexOf('.');
    if (dotIndex > 0) {
      shortName = shortName.substr(0, dotIndex);
    }

    let bundleName = shortName.replace(/[ .]/g, '').toLowerCase();
    if (conditionValueOrVariationObject) {
      if (typeof conditionValueOrVariationObject === 'string') {
        bundleName += `-${conditionValueOrVariationObject}`;
      } else {
        for (const condition of Object.keys(conditionValueOrVariationObject)) {
          bundleName += `-${conditionValueOrVariationObject[condition]}`;
        }
      }
    }

    let i;
    if (bundles[bundleName]) {
      i = 1;
      while (bundles[`${bundleName}-${i}`]) {
        i += 1;
      }
    }
    return bundleName + (i ? `-${i}` : '');
  }

  // intersect two arrays
  function intersectModules(modulesA, modulesB) {
    const intersection = [];
    for (const module of modulesA) {
      if (modulesB.includes(module)) {
        intersection.push(module);
      }
    }
    return intersection;
  }

  // remove elements of arrayB from arrayA
  function subtractModules(modulesA, modulesB) {
    const subtracted = [];
    for (const module of modulesA) {
      if (!modulesB.includes(module)) {
        subtracted.push(module);
      }
    }
    return subtracted;
  }

  // returns true if modulesA contains all the modules in modulesB
  function containsModules(modulesA, modulesB) {
    return !modulesB.some(module => !modulesA.includes(module));
  }

  async function getModuleTrace(entryPointName, options) {
    const tree = await builder.trace(entryPointName, options);
    return Object.keys(tree).filter(
      module => tree[module] && !tree[module].conditional
    );
  }

  // intermediate data
  const manualBundles = options.manualBundles || {};
  const entryPointModules = [
    /*{ name, deferredParent, modules / conditionalVariations: [{ modules, conditions }]*/
  ];
  let allEntryPoints = [...entryPoints];
  let conditionalEnv;

  // Trace the deferred entry points to get all entry points
  if (options.deferredImports) {
    await Promise.map(entryPoints, async entryPoint => {
      const tree = await builder.trace(entryPoint.name, options);
      const deferredImports = await builder.getDeferredImports(tree);
      allEntryPoints.push(
        ...deferredImports.map(deferredImport => ({
          name: deferredImport.name,
          deferredParent: entryPoint.name
        }))
      );
    });
  }

  // populate entryPointModules from allEntryPoints
  // based on determining conditional variations and associated modules
  // { name, deferredParent, conditions, modules }
  await Promise.map(allEntryPoints, async entryPoint => {
    conditionalEnv = await builder.traceConditionalEnv(
      entryPoint.name,
      Object.assign({ inlineConditions }, options)
    );

    // remove set conditions from conditionalEnv
    for (const condition of Object.keys(options.conditions || {})) {
      delete conditionalEnv[condition];
    }

    // generate conditional combinations recursively (for general case of arbitrarily many conditional combinations)
    function generateVariationsOverConditions(conditionList) {
      let curCondition = conditionList[0];

      if (!curCondition) {
        return [];
      }

      // get combinations from the n - 1th dimension
      const nextVariations = generateVariationsOverConditions(
        conditionList.slice(1)
      );
      const variations = [];

      if (!nextVariations.length) {
        for (const curConditionValue of conditionalEnv[curCondition]) {
          const variationConditions = {};
          variationConditions[curCondition] = curConditionValue;
          variations.push(variationConditions);
        }
      }

      // multiply the combinations of the n - 1 dimension by the cominations of this nth dimension
      for (const nextVariation of nextVariations) {
        for (const curConditionValue of conditionalEnv[curCondition]) {
          const variationConditions = Object.assign({}, nextVariation);
          variationConditions[curCondition] = curConditionValue;
          variations.push(variationConditions);
        }
      }

      return variations;
    }

    const conditionsCombinations = generateVariationsOverConditions(
      Object.keys(conditionalEnv)
    );

    if (conditionsCombinations.length === 0) {
      const modules = await getModuleTrace(
        entryPoint.name,
        Object.assign({ inlineConditions }, options)
      );
      entryPointModules.push({
        name: entryPoint.name,
        deferredParent: entryPoint.deferredParent,
        modules
      });
      return;
    }

    // trace conditional variations
    const conditionalVariations = [];
    entryPointModules.push({
      name: entryPoint.name,
      deferredParent: entryPoint.deferredParent,
      conditionalVariations
    });

    for (const [i, conditions] of conditionsCombinations.entries()) {
      const modules = await getModuleTrace(
        entryPoint.name,
        Object.assign(Object.assign({}, options), {
          inlineConditions,
          conditions: Object.assign({}, conditions)
        })
      );
      conditionalVariations[i] = { modules, conditions };
    }
  });

  // We now have a four-layer optimization:
  // - common bundle
  // - manual bundles
  // - entry point bundle over all conditions
  // - entry point bundle over specific entry point condition
  // for each entry point, we remove the layers from the above
  // what we are left with is the entry point-specific bundle (if any)
  // we then populate entryPointBundles and bundles with this derivation

  // first we determine the common bundle
  let commonModules;
  let commonBundleName;

  // determine common modules
  for (const entryPoint of entryPointModules) {
    // deferredParent modules not included in base-level common bundle
    if (entryPoint.deferredParent) {
      continue;
    }

    if (entryPoint.modules) {
      if (!commonModules) {
        commonModules = [...entryPoint.modules];
      } else {
        commonModules = intersectModules(commonModules, entryPoint.modules);
      }
    } else {
      for (const variation of entryPoint.conditionalVariations) {
        if (!commonModules) {
          commonModules = [...variation.modules];
        } else {
          commonModules = intersectModules(commonModules, variation.modules);
        }
      }
    }
  }

  // subtract manual bundles from the common bundle
  if (commonModules && commonModules.length) {
    for (const manualBundleName of Object.keys(manualBundles)) {
      const manualBundleModules = manualBundles[manualBundleName];
      if (containsModules(commonModules, manualBundleModules)) {
        commonModules = subtractModules(commonModules, manualBundleModules);
      }
    }
  }

  /*
     * Populate bundles and entryPointBundles
     */
  if (commonModules && commonModules.length > 0) {
    bundles[
      (commonBundleName = generateBundleName('common-bundle', commonModules))
    ] = {
      entryPoints: [],
      modules: commonModules,
      source: undefined,
      sourceMap: undefined,
      assetList: undefined
    };
  }

  for (const manualBundleName of Object.keys(manualBundles)) {
    bundles[manualBundleName] = {
      entryPoints: [],
      modules: manualBundles[manualBundleName],
      source: undefined,
      sourceMap: undefined,
      assetList: undefined
    };
  }

  for (const entryPoint of entryPointModules) {
    const entryPointItem = {
      name: entryPoint.name,
      deferredParent: entryPoint.deferredParent,
      conditions: {}
    };

    if (entryPoint.modules) {
      let entryPointBundleModules = entryPoint.modules;

      // subtract common layer
      if (
        commonModules &&
        commonModules.length &&
        containsModules(entryPointBundleModules, commonModules)
      ) {
        entryPointBundleModules = subtractModules(
          entryPointBundleModules,
          commonModules
        );
        bundles[commonBundleName].entryPoints.push(entryPointItem);
      }

      // subtract manual bundles
      for (const manualBundle of Object.keys(manualBundles)) {
        const manualBundleModules = manualBundles[manualBundle];
        if (containsModules(entryPointBundleModules, manualBundleModules)) {
          entryPointBundleModules = subtractModules(
            entryPointBundleModules,
            manualBundleModules
          );
          bundles[manualBundle].entryPoints.push(entryPointItem);
        }
      }

      // if there is anything left over then we create the entry-point-specific bundle
      if (entryPointBundleModules.length > 0) {
        const bundleName = generateBundleName(
          `bundle-${entryPoint.name}`,
          entryPointBundleModules
        );
        bundles[bundleName] = bundles[bundleName] || {
          entryPoints: [],
          modules: entryPointBundleModules,
          source: undefined,
          sourceMap: undefined,
          assetList: undefined
        };
        bundles[bundleName].entryPoints.push(entryPointItem);
      }

      // entry point has conditionals
    } else {
      let commonVariationModules;
      let commonVariationBundleName;

      // determine common variation modules
      for (const variation of entryPoint.conditionalVariations) {
        if (commonVariationModules) {
          commonVariationModules = intersectModules(
            commonVariationModules,
            variation.modules
          );
        } else {
          commonVariationModules = [...variation.modules];
        }
      }

      // subtract common modules from common variation bundle
      if (
        commonVariationModules &&
        commonVariationModules.length > 0 &&
        commonModules &&
        commonModules.length
      ) {
        if (containsModules(commonVariationModules, commonModules)) {
          commonVariationModules = subtractModules(
            commonVariationModules,
            commonModules
          );
        }
      }

      if (commonBundleName) {
        bundles[commonBundleName].entryPoints.push(entryPointItem);
      }

      // subtract manual bundles from the common variation bundle
      if (commonVariationModules && commonVariationModules.length) {
        for (const manualBundleName of Object.keys(manualBundles)) {
          const manualBundleModules = manualBundles[manualBundleName];
          if (containsModules(commonVariationModules, manualBundleModules)) {
            commonVariationModules = subtractModules(
              commonVariationModules,
              manualBundleModules
            );
          }
        }
      }

      // save the common variation bundle
      if (commonVariationModules && commonVariationModules.length) {
        commonVariationBundleName = generateBundleName(
          `common-${entryPoint.name}`,
          commonVariationModules
        );
        bundles[commonVariationBundleName] = bundles[
          commonVariationBundleName
        ] || {
          entryPoints: [],
          modules: commonVariationModules,
          source: undefined,
          sourceMap: undefined,
          assetList: undefined
        };
        bundles[commonVariationBundleName].entryPoints.push(entryPointItem);
      }

      // for each independent condition value, generate a common layer
      const independentConditionBundles = [];

      for (const condition of Object.keys(conditionalEnv)) {
        for (const conditionValue of conditionalEnv[condition]) {
          const independentEntryPoint = {
            name: entryPoint.name,
            deferredParent: entryPoint.deferredParent,
            conditions: {}
          };
          independentEntryPoint.conditions[condition] = conditionValue;

          let curModules;

          // for this condition and conditionValue, determine the common bundle over all other conditional variations
          for (const variation of entryPoint.conditionalVariations) {
            if (variation.conditions[condition] !== conditionValue) {
              continue;
            }
            if (!curModules) {
              curModules = [...variation.modules];
              continue;
            }
            curModules = intersectModules(curModules, variation.modules);
          }

          // subtract common modules from common variation bundle
          if (
            curModules &&
            curModules.length > 0 &&
            commonModules &&
            commonModules.length > 0
          ) {
            if (containsModules(curModules, commonModules)) {
              curModules = subtractModules(curModules, commonModules);
            }
          }

          // subtract common variation modules from common variation bundle
          if (
            curModules &&
            curModules.length > 0 &&
            commonVariationModules &&
            commonVariationModules.length > 0
          ) {
            if (containsModules(curModules, commonVariationModules)) {
              curModules = subtractModules(curModules, commonVariationModules);
            }
          }

          // subtract previous independent conditional layers
          for (const independentConditionBundle of independentConditionBundles) {
            const independentConditionModules =
              bundles[independentConditionBundle].modules;
            if (containsModules(curModules, independentConditionModules)) {
              curModules = subtractModules(
                curModules,
                independentConditionModules
              );
            }
          }

          // subtract manual bundles from the independent condition bundle
          if (curModules && curModules.length) {
            for (const manualBundleName of Object.keys(manualBundles)) {
              const manualBundleModules = manualBundles[manualBundleName];
              if (containsModules(curModules, manualBundleModules)) {
                curModules = subtractModules(curModules, manualBundleModules);
              }
            }
          }
          // save the independent condition bundle if it has any modules
          if (curModules && curModules.length > 0) {
            independentConditionBundles.push(
              generateBundleName(
                `bundle-${entryPoint.name}`,
                curModules,
                conditionValue
              )
            );
            const independentConditionBundleName =
              independentConditionBundles[
                independentConditionBundles.length - 1
              ];
            bundles[independentConditionBundleName] = bundles[
              independentConditionBundleName
            ] || {
              entryPoints: [],
              modules: curModules,
              source: undefined,
              sourceMap: undefined,
              assetList: undefined
            };
            bundles[independentConditionBundleName].entryPoints.push(
              independentEntryPoint
            );
          }
        }
      }

      // create each variation bundle
      for (const variation of entryPoint.conditionalVariations) {
        let entryPointBundleModules = variation.modules;

        const entryPointVariation = {
          name: entryPoint.name,
          deferredParent: entryPoint.deferredParent,
          conditions: variation.conditions
        };

        // subtract common layer
        if (
          commonModules &&
          commonModules.length > 0 &&
          containsModules(entryPointBundleModules, commonModules)
        ) {
          entryPointBundleModules = subtractModules(
            entryPointBundleModules,
            commonModules
          );
        }

        // subtract common variation layer
        if (
          commonVariationModules &&
          commonVariationModules.length > 0 &&
          containsModules(entryPointBundleModules, commonVariationModules)
        ) {
          entryPointBundleModules = subtractModules(
            entryPointBundleModules,
            commonVariationModules
          );
        }

        // subtract all independent condition layers
        for (const independentConditionBundle of independentConditionBundles) {
          const independentConditionModules =
            bundles[independentConditionBundle].modules;
          if (
            containsModules(
              entryPointBundleModules,
              independentConditionModules
            )
          ) {
            entryPointBundleModules = subtractModules(
              entryPointBundleModules,
              independentConditionModules
            );
          }
        }

        // subtract manual bundles
        for (const manualBundle of Object.keys(manualBundles)) {
          const manualBundleModules = manualBundles[manualBundle];
          if (containsModules(entryPointBundleModules, manualBundleModules)) {
            entryPointBundleModules = subtractModules(
              entryPointBundleModules,
              manualBundleModules
            );
            bundles[manualBundle].entryPoints.push(entryPointVariation);
          }
        }

        // if there is anything left over then we create the entry-point-variation-specific bundle
        if (entryPointBundleModules.length > 0) {
          const bundleName = generateBundleName(
            `bundle-${entryPoint.name}`,
            entryPointBundleModules,
            variation.conditions
          );
          bundles[bundleName] = bundles[bundleName] || {
            entryPoints: [],
            modules: entryPointBundleModules,
            source: undefined,
            sourceMap: undefined,
            assetList: undefined
          };
          bundles[bundleName].entryPoints.push(entryPointVariation);
        }
      }
    }
  }

  // finally, now that we have all bundles calculated, generate the bundle sources

  await Promise.map(Object.keys(bundles), async bundleName => {
    const bundle = bundles[bundleName];
    const output = await builder.bundle(
      bundle.modules,
      Object.assign({ inlineConditions }, options)
    );
    bundle.source = output.source;
    bundle.sourceMap = output.sourceMap;
    bundle.assetList = output.assetList;
  });

  return bundles;
}

const systemJsGlobals = {};

module.exports = ({ polyfill = false, conditions, deferredImports } = {}) => {
  return async function bundleSystemJs(assetGraph) {
    const potentiallyOrphanedAssets = new Set();
    const htmlScriptsToRemove = [];
    function cleanUp() {
      for (const htmlScript of htmlScriptsToRemove) {
        const htmlAsset = htmlScript.from;
        htmlScript.detach();
        htmlAsset.markDirty();
      }

      // Clean up system.js assets if nothing is referring to them any more
      for (const asset of potentiallyOrphanedAssets) {
        if (assetGraph.findRelations({ to: asset }).length === 0) {
          assetGraph.removeAsset(asset);
        }
      }
    }

    // Parse a source map (if given as a string) and absolutify the urls in the sources array:
    function preprocessSourceMap(sourceMap) {
      if (typeof sourceMap === 'string') {
        sourceMap = JSON.parse(sourceMap);
      }
      if (sourceMap && Array.isArray(sourceMap.sources)) {
        sourceMap.sources = sourceMap.sources.map(sourceUrl =>
          urlTools.resolveUrl(assetGraph.root, sourceUrl.replace(/^\//, ''))
        );
      }
      return sourceMap;
    }

    const systemJsConfig = extractSystemJsConfig(
      assetGraph.findRelations({
        type: {
          $in: [
            'HtmlScript',
            'HtmlServiceWorkerRegistration',
            'JavaScriptServiceWorkerRegistration',
            'JavaScriptWebWorker',
            'JavaScriptImportScripts'
          ]
        },
        to: { isLoaded: true }
      })
    );
    let doneFirstConfigCall = false;
    const configStatements = systemJsConfig.configStatements.sort((a, b) => {
      const aRelationsByPageId = {};
      const bRelationsByPageId = {};
      for (const incomingRelation of assetGraph.findRelations({
        to: a.asset
      })) {
        (aRelationsByPageId[incomingRelation.from.id] =
          aRelationsByPageId[incomingRelation.from.id] || []).push(
          incomingRelation
        );
      }
      for (const incomingRelation of assetGraph.findRelations({
        to: b.asset
      })) {
        (bRelationsByPageId[incomingRelation.from.id] =
          bRelationsByPageId[incomingRelation.from.id] || []).push(
          incomingRelation
        );
      }

      const pageIds = _.uniq([
        ...Object.keys(aRelationsByPageId),
        ...Object.keys(bRelationsByPageId)
      ]);
      if (
        pageIds.every(pageId => {
          return (aRelationsByPageId[pageId] || []).every(aRelation => {
            return (bRelationsByPageId[pageId] || []).every(bRelation => {
              return (
                aRelation.from.outgoingRelations.indexOf(aRelation) <=
                bRelation.from.outgoingRelations.indexOf(bRelation)
              );
            });
          });
        })
      ) {
        return -1;
      } else if (
        pageIds.every(pageId => {
          return (bRelationsByPageId[pageId] || []).every(bRelation => {
            return (aRelationsByPageId[pageId] || []).every(aRelation => {
              return (
                bRelation.from.outgoingRelations.indexOf(bRelation) <=
                aRelation.from.outgoingRelations.indexOf(aRelation)
              );
            });
          });
        })
      ) {
        return 1;
      }
      throw new Error(
        'System.config calls come in conflicting order across pages'
      );
    });

    const topLevelSystemImportCalls = systemJsConfig.topLevelSystemImportCalls;
    const canonicalNames = _.uniq(
      topLevelSystemImportCalls.map(topLevelSystemImportCall => {
        return topLevelSystemImportCall.argumentString;
      })
    );

    for (const htmlScript of assetGraph.findRelations({ type: 'HtmlScript' })) {
      const htmlAsset = htmlScript.from;
      let markDirty = false;
      if (htmlScript.node.hasAttribute('data-systemjs-polyfill')) {
        if (polyfill) {
          const href =
            htmlScript.node.getAttribute('data-systemjs-polyfill') ||
            (htmlScript.href || '').replace(/[^/]*$/, 'system-polyfills.js');
          htmlScript.from.addRelation(
            {
              type: 'HtmlScript',
              hrefType: 'rootRelative',
              href
            },
            'before',
            htmlScript
          );
        }
        htmlScript.node.removeAttribute('data-systemjs-polyfill');
        markDirty = true;
      }

      if (htmlScript.node.hasAttribute('data-systemjs-csp-production')) {
        const dataSystemJsCspProduction = htmlScript.node.getAttribute(
          'data-systemjs-csp-production'
        );
        potentiallyOrphanedAssets.add(htmlScript.to);
        const href =
          dataSystemJsCspProduction ||
          (htmlScript.href || '').replace(/[^/]*$/, 'system-csp-production.js');
        htmlScript.to = assetGraph.addAsset({
          url: assetGraph.resolveUrl(
            htmlScript.from.nonInlineAncestor.url,
            href
          )
        });
        htmlScript.href = href;
        htmlScript.node.removeAttribute('data-systemjs-csp-production');
        markDirty = true;
      }
      if (markDirty) {
        htmlAsset.markDirty();
      }

      if (htmlScript.node.hasAttribute('data-systemjs-remove')) {
        potentiallyOrphanedAssets.add(htmlScript.to);
        htmlScriptsToRemove.push(htmlScript);
      }
    }

    if (canonicalNames.length === 0) {
      cleanUp();
      return;
    }

    const entryPointInfosByPageId = {};
    const occurrences = [];

    for (const topLevelSystemImportCall of topLevelSystemImportCalls) {
      const incomingRelations = assetGraph.findRelations({
        type: {
          $in: [
            'HtmlScript',
            'HtmlServiceWorkerRegistration',
            'JavaScriptServiceWorkerRegistration',
            'JavaScriptWebWorker'
          ]
        },
        to: topLevelSystemImportCall.asset
      });
      for (const incomingRelation of incomingRelations) {
        const page = incomingRelation.from;
        const occurrence = _.defaults(
          { page, incomingRelation },
          topLevelSystemImportCall
        );
        occurrences.push(occurrence);
        (entryPointInfosByPageId[page.id] =
          entryPointInfosByPageId[page.id] || []).push(occurrence);
      }
    }

    const pagesWithEntryPoints = Object.keys(entryPointInfosByPageId).map(
      pageId => assetGraph.findAssets({ id: pageId })[0]
    );

    const manualBundles = {};

    for (const configStatement of configStatements) {
      configStatement.obj = esanimate.objectify(
        configStatement.node.arguments[0]
      );
      if (configStatement.obj.manualBundles) {
        for (const bundleId of Object.keys(configStatement.obj.manualBundles)) {
          if (manualBundles[bundleId]) {
            if (
              !_.isEqual(
                [...manualBundles[bundleId]].sort(),
                [...configStatement.obj.manualBundles[bundleId]].sort()
              )
            ) {
              throw new Error(
                `Conflicting definitions of the manual bundle ${bundleId}`
              );
            }
          } else {
            manualBundles[bundleId] =
              configStatement.obj.manualBundles[bundleId];
          }
        }
      }

      let dirty = false;
      const objectLiteralNode = configStatement.node.arguments[0];
      objectLiteralNode.properties = objectLiteralNode.properties.filter(
        propertyNode => {
          if (
            propertyNode.key.type === 'Identifier' &&
            (propertyNode.key.name === 'buildConfig' ||
              propertyNode.key.name === 'testConfig')
          ) {
            dirty = true;
            return false;
          } else {
            return true;
          }
        }
      );
      if (objectLiteralNode.properties.length === 0) {
        const parentBody =
          configStatement.parentNode.body ||
          configStatement.parentNode.expressions;
        parentBody.splice(
          parentBody.indexOf(configStatement.detachableNode),
          1
        );
        dirty = true;
      }
      if (dirty) {
        configStatement.asset.markDirty();
      }
    }

    function isConfigIncludedOnEveryPage(configStatement) {
      return pagesWithEntryPoints.every(pageWithEntryPoint => {
        return (
          assetGraph.findRelations({
            from: pageWithEntryPoint,
            to: configStatement.asset
          }).length > 0
        );
      });
    }

    for (const configStatement of configStatements) {
      if (
        !isConfigIncludedOnEveryPage(configStatement) &&
        configStatements.some(otherConfigStatement => {
          return detectSystemJSConflict(
            configStatement.obj,
            otherConfigStatement.obj
          );
        })
      ) {
        throw new Error('Configs conflict');
      }
    }

    // For cleaning up global leaks:
    const globalSnapshotBeforeRequire = Object.assign({}, global);

    let SystemJsBuilder;
    try {
      // Will leak globals when required the first time: __curScript, URLPolyfill, SystemJS, System
      SystemJsBuilder = require('systemjs-builder');
    } catch (e) {
      throw new Error(
        `The graph contains ${
          topLevelSystemImportCalls.length
        } top-level System.import call${
          topLevelSystemImportCalls.length === 1 ? '' : 's'
        }, but systemjs-builder is not available. Please install systemjs-builder 0.14.9+ in the the containing project.`
      );
    }

    // Will leak globals: $traceurRuntime, traceur
    const builder = new SystemJsBuilder();
    for (const leakedKey of _.difference(
      Object.keys(global),
      Object.keys(globalSnapshotBeforeRequire)
    )) {
      systemJsGlobals[leakedKey] = global[leakedKey];
    }

    for (const configStatement of configStatements) {
      if (configStatement.obj.baseURL) {
        if (!/^\//.test(configStatement.obj.baseURL)) {
          throw new Error('the System.js baseURL must be absolute');
        }
        configStatement.obj.baseURL = urlTools.resolveUrl(
          assetGraph.root,
          configStatement.obj.baseURL.replace(/^\//, '')
        );
      } else if (!doneFirstConfigCall) {
        configStatement.obj.baseURL = assetGraph.root;
      }
      builder.config(_.clone(configStatement.obj, true));
      doneFirstConfigCall = true;
    }
    const entryPointNames = _.uniq(
      topLevelSystemImportCalls.map(topLevelSystemImportCall => {
        return topLevelSystemImportCall.argumentString;
      })
    );

    const bundleStrategyOptions = {
      production: true,
      normalize: true,
      traceConditionModules: !conditions,
      deferredImports,
      manualBundles,
      sourceMaps: true,
      assetRoot: assetGraph.root,
      inlinePlugins: false // Skip inlining resources like css, handled through the asset list
    };

    if (typeof conditions !== 'undefined') {
      bundleStrategyOptions.conditions = conditions;
    }

    const globalSnapshotBeforeBundling = { ...global };
    _.defaults(global, systemJsGlobals);

    try {
      const bundles = await bundleStrategy(
        builder,
        entryPointNames.map(entryPointName => ({ name: entryPointName })),
        bundleStrategyOptions
      );
      const isSeenByPageIdAndBundleId = {};
      const assetListEntryByUrl = {};
      const attachAssetsPromises = [];
      const assetByBundleId = {};

      /* eslint-disable no-inner-declarations */
      function addBundle(bundleId, incomingRelation, conditions) {
        const bundle = bundles[bundleId];
        let bundleAsset = assetByBundleId[bundleId];
        if (!bundleAsset) {
          bundleAsset = assetByBundleId[bundleId] = assetGraph.addAsset({
            type: 'JavaScript',
            baseName: bundleId,
            text: bundle.source,
            sourceMap: preprocessSourceMap(bundle.sourceMap)
          });
        }
        let keepBundleInGraph = true;
        if (
          incomingRelation.type === 'HtmlServiceWorkerRegistration' ||
          incomingRelation.type === 'JavaScriptServiceWorkerRegistration' ||
          incomingRelation.type === 'JavaScriptWebWorker'
        ) {
          const lastImportScript = assetGraph
            .findRelations({
              type: 'JavaScriptImportScripts',
              from: incomingRelation.to
            })
            .pop();

          incomingRelation.to.addRelation(
            {
              type: 'JavaScriptImportScripts',
              to: bundleAsset,
              hrefType: 'rootRelative'
            },
            lastImportScript ? 'after' : 'first',
            lastImportScript
          );
        } else {
          // assume 'HtmlScript'
          if (htmlScriptsToRemove.includes(incomingRelation)) {
            // The script containing the entry point is marked for removal, don't add the bundle to the graph
            keepBundleInGraph = false;
          } else {
            const htmlScript = incomingRelation.from.addRelation(
              {
                type: 'HtmlScript',
                hrefType: 'rootRelative',
                to: bundleAsset
              },
              'before',
              incomingRelation
            );
            if (conditions && Object.keys(conditions).length > 0) {
              htmlScript.node.setAttribute(
                'data-assetgraph-conditions',
                assetGraphConditions.stringify(conditions)
              );
              htmlScript.from.markDirty();
            }
          }
        }
        if (!keepBundleInGraph) {
          assetGraph.removeAsset(bundleAsset);
        }
        for (const { source, type, url, sourceMap } of bundle.assetList || []) {
          let asset = assetListEntryByUrl[url];
          if (!asset) {
            const assetConfig = { url, sourceMap };
            if (type === 'css') {
              assetConfig.type = 'Css';
            }
            if (typeof source === 'string') {
              assetConfig.text = source;
            }
            asset = assetGraph.addAsset(assetConfig);
            assetListEntryByUrl[url] = asset;
            attachAssetsPromises.push(asset.load());
          }

          if (asset.type === 'Css') {
            const htmlStyle = incomingRelation.from.addRelation(
              {
                type: 'HtmlStyle',
                hrefType: 'rootRelative',
                to: asset
              },
              'last'
            );
            if (conditions && Object.keys(conditions).length > 0) {
              htmlStyle.node.setAttribute(
                'data-assetgraph-conditions',
                assetGraphConditions.stringify(conditions)
              );
              htmlStyle.from.markDirty();
            }
          } else if (keepBundleInGraph) {
            bundleAsset.addRelation(
              {
                type: 'SystemJsBundle',
                hrefType: 'rootRelative',
                to: asset
              },
              'last'
            );
          } else {
            assetGraph.warn(
              new Error(
                `Cannot attach relation to ${
                  asset.urlOrDescription
                } when the <script> containing the entry point has the data-systemjs-remove property`
              )
            );
          }
        }
      }

      for (const pageId of Object.keys(entryPointInfosByPageId)) {
        isSeenByPageIdAndBundleId[pageId] = {};
        for (const occurrence of entryPointInfosByPageId[pageId]) {
          for (const bundleId of Object.keys(bundles)) {
            for (const entryPoint of bundles[bundleId].entryPoints) {
              if (
                entryPoint.name === occurrence.argumentString &&
                !entryPoint.deferredParent
              ) {
                addBundle(
                  bundleId,
                  occurrence.incomingRelation,
                  entryPoint.conditions
                );
              }
            }
          }
        }
      }
      for (const bundleId of Object.keys(bundles)) {
        const bundle = bundles[bundleId];
        for (const { deferredParent } of bundle.entryPoints) {
          if (deferredParent) {
            // Find the occurrence object corresponding to the parent
            // entry point of the deferred System.import:
            let parentOccurrence;
            for (const occurrence of occurrences) {
              if (occurrence.argumentString === deferredParent) {
                parentOccurrence = occurrence;
                break;
              }
            }
            if (!parentOccurrence) {
              throw new Error(
                `No parent occurrence found for deferredParent: ${deferredParent}`
              );
            }
            const configBundleArgument = {};
            configBundleArgument[bundleId] = bundle.modules;
            const configBundleArgumentAst = esanimate.astify({
              bundles: configBundleArgument
            });

            const configScript = parentOccurrence.incomingRelation.from.addRelation(
              {
                type: 'HtmlScript',
                to: {
                  type: 'JavaScript',
                  parseTree: {
                    type: 'Program',
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: {
                          type: 'CallExpression',
                          callee: {
                            type: 'MemberExpression',
                            computed: false,
                            object: {
                              type: 'Identifier',
                              name: 'System'
                            },
                            property: {
                              type: 'Identifier',
                              name: 'config'
                            }
                          },
                          arguments: [configBundleArgumentAst]
                        }
                      }
                    ]
                  }
                }
              },
              'before',
              parentOccurrence.incomingRelation
            ).to;
            if (
              !isSeenByPageIdAndBundleId[parentOccurrence.page.id][bundleId]
            ) {
              isSeenByPageIdAndBundleId[parentOccurrence.page.id][
                bundleId
              ] = true;
              let node;
              for (const propertyNode of configBundleArgumentAst.properties[0]
                .value.properties) {
                if (
                  (propertyNode.key.name || propertyNode.key.value) === bundleId
                ) {
                  node = propertyNode;
                  break;
                }
              }
              configScript.addRelation(
                {
                  type: 'SystemJsLazyBundle',
                  from: configScript,
                  to: {
                    type: 'JavaScript',
                    text: bundle.source,
                    url: `${bundleId}.js`,
                    sourceMap: preprocessSourceMap(bundle.sourceMap)
                  },
                  node
                },
                'last'
              );
            }
          }
        }
      }
      await Promise.all(attachAssetsPromises);

      cleanUp();
    } finally {
      for (const key of [
        ...Object.keys(systemJsGlobals),
        ..._.difference(
          Object.keys(global),
          Object.keys(globalSnapshotBeforeBundling)
        )
      ]) {
        delete global[key];
      }
    }
  };
};

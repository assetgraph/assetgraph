/*jshint unused:false*/
var _ = require('lodash'),
    Promise = require('bluebird'),
    esanimate = require('esanimate'),
    estraverse = require('estraverse'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

function singleQuoteString(str) {
    return "'" + str.replace(/'/g, "\\'") + "'";
}

function extractSystemJsConfig(incomingRelations) { // HtmlScript, JavaScriptWebWorker and JavaScriptImportScripts
    var systemJsConfig = {
        configStatements: [],
        topLevelSystemImportCalls: []
    };
    incomingRelations.forEach(function (relation) {
        var seenConfig = false;
        var seenImport = false;
        estraverse.traverse(relation.to.parseTree, {
            enter: function (node, parentNode) {
                if (node.type === 'CallExpression' &&
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.object.type === 'Identifier' &&
                    (node.callee.object.name === 'System' || node.callee.object.name === 'SystemJS') &&
                    node.callee.property.type === 'Identifier' &&
                    node.arguments.length === 1) {

                    if (node.callee.property.name === 'config') {
                        seenConfig = true;
                        var parentNodes = this.parents();
                        systemJsConfig.configStatements.push({
                            asset: relation.to,
                            node: node,
                            parentNode: parentNode.type === 'SequenceExpression' ? parentNodes[parentNodes.length - 1] : parentNodes[parentNodes.length - 2],
                            detachableNode: parentNode.type === 'SequenceExpression' ? node : parentNodes[parentNodes.length - 1]
                        });
                    } else if (node.callee.property.name === 'import') {
                        seenImport = true;
                        systemJsConfig.topLevelSystemImportCalls.push({
                            argumentString: node.arguments[0].value,
                            asset: relation.to,
                            node: node
                        });
                    }
                }
            }
        });
        if (seenConfig && seenImport) {
            throw new Error('Please do not use both System.config and System.import in the same script as it will cause the generated bundle to be injected in the wrong place.');
        }
    });
    return systemJsConfig;
}

// meta, packages deep
function getSharedProperties(configA, configB) {
    var bKeys = Object.keys(configB);
    return Object.keys(configA).filter(function (p) {
        return bKeys.indexOf(p) !== -1;
    });
}

function arrayEquals(arrayA, arrayB) {
    // TODO! DO this properly
    return JSON.stringify(arrayA.sort()) === JSON.stringify(arrayB.sort());
}

function detectObjectConflict(objA, objB) {
    if (!objA || !objB) {
        return false;
    }
    return getSharedProperties(objA, objB).some(function (prop) {
        var valueA = objA[prop];
        var valueB = objB[prop];
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
    return getSharedProperties(metaA, metaB).some(function (prop) {
        var valueA = metaA[prop];
        var valueB = metaB[prop];

        // ensure both arrays (which would concat in conflict scenario)
        if (valueA instanceof Array || valueB instanceof Array) {
            return !(valueA instanceof Array && valueB instanceof Array) || !arrayEquals(valueA, valueB);
        } else if (typeof valueA === 'object' || typeof valueB === 'object') {
            // ensure objects don't conflict
            return !(typeof valueA === 'object' && typeof valueB === 'object') || detectObjectConflict(valueA, valueB);
        } else {
            return valueA !== valueB;
        }
    });
}

function detectSystemJSConflict(configA, configB) {
    if (['pluginFirst', 'defaultJSExtensions'].some(function (value) {
        if (typeof configA[value] !== 'undefined' && typeof configB[value] !== 'undefined') {
            return configA[value] !== configB[value];
        }
    })) {
        return true;
    }
    if (typeof configA.packageConfigPaths !== 'undefined' && typeof configB.packageConfigPaths !== 'undefined') {
        return !arrayEquals(configA.packageConfigPaths, configB.packageConfigPaths);
    }

    if (['map', 'paths', 'bundles', 'depCache'].some(function (value) {
        return detectObjectConflict(configA[value], configB[value]);
    })) {
        return true;
    }

    if (['meta', 'babelOptions', 'traceurOptions'].some(function (value) {
        return detectMetaConflict(configA[value], configB[value]);
    })) {
        return true;
    }

    if (configA.packages && configB.packages) {
        if (getSharedProperties(configA.packages, configB.packages).some(function (pkgName) {
            var packageA = configA.packages[pkgName];
            var packageB = configB.packages[pkgName];
            if (['main', 'format', 'defaultExtension', 'basePath'].some(function (value) {
                return packageA[value] !== packageB[value];
            })) {
                return true;
            }

            if (['map', 'depCache'].some(function (value) {
                return detectObjectConflict(packageA[value], packageB[value]);
            })) {
                return true;
            }

            if (packageA.modules && packageB.modules) {
                if (detectMetaConflict(packageA.modules, packageB.modules)) {
                    return true;
                }
            }
        })) {
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
function bundleStrategy(builder, entryPoints, options) {
    // output
    var entryPointBundles = [];
    var bundles = {};

    entryPoints = entryPoints.concat([]);

    // disable plugin asset inlining as asset graph will handle this itself
    if (typeof options.inlinePlugins === 'undefined') {
        options.inlinePlugins = false;
    }

    if (typeof options.sourceMaps === 'undefined') {
        options.sourceMaps = false;
    }
    // simple random bundle name generation
    // with duplication avoidance
    function generateBundleName(name, modules, conditions) {
        // first check if the given modules already matches an existing bundle
        var existingBundleName;
        Object.keys(bundles).forEach(function (bundleName) {
            var bundleModules = bundles[bundleName].modules;

            if (containsModules(modules, bundleModules) && containsModules(bundleModules, modules)) {
                existingBundleName = bundleName;
            }
        });
        if (existingBundleName) {
            return existingBundleName;
        }

        var shortName = name.split('/').pop();
        var dotIndex = shortName.lastIndexOf('.');
        if (dotIndex > 0) {
            shortName = shortName.substr(0, dotIndex);
        }

        var bundleName = shortName.replace(/[ \.]/g, '').toLowerCase();
        if (conditions) {
            Object.keys(conditions).forEach(function (condition) {
                bundleName += '-' + conditions[condition];
            });
        }

        var i;
        if (bundles[bundleName]) {
            i = 1;
            while (bundles[bundleName + '-' + i]) {
                i += 1;
            }
        }
        return bundleName + (i ? '-' + i : '');
    }

    // intersect two arrays
    function intersectModules(modulesA, modulesB) {
        var intersection = [];
        modulesA.forEach(function (module) {
            if (modulesB.indexOf(module) !== -1) {
                intersection.push(module);
            }
        });
        return intersection;
    }

    // remove elements of arrayB from arrayA
    function subtractModules(modulesA, modulesB) {
        var subtracted = [];
        modulesA.forEach(function (module) {
            if (modulesB.indexOf(module) === -1) {
                subtracted.push(module);
            }
        });
        return subtracted;
    }

    // returns true if modulesA contains all the modules in modulesB
    function containsModules(modulesA, modulesB) {
        return !modulesB.some(function (module) {
            return modulesA.indexOf(module) === -1;
        });
    }

    function getModuleTrace(entryPointName, options) {
        return builder.trace(entryPointName, options)
        .then(function (tree) {
            return Object.keys(tree).filter(function (module) {
                return tree[module] && !tree[module].conditional;
            });
        });
    }

    // intermediate data
    var manualBundles = options.manualBundles || {};
    var entryPointModules = [/*{ name, deferredParent, modules / conditionalVariations: [{ modules, conditions }]*/];
    var allEntryPoints = [].concat(entryPoints);

    // Trace the deferred entry points to get all entry points
    return Promise.resolve()
    .then(function () {
        if (!options.deferredImports) {
            return;
        }

        return Promise.all(entryPoints.map(function (entryPoint) {
            return builder.trace(entryPoint.name, options)
            .then(function (tree) {
                return builder.getDeferredImports(tree).then(function (deferredImports) {
                    allEntryPoints = allEntryPoints.concat(deferredImports.map(function (deferredImport) {
                        return {
                            name: deferredImport.name,
                            deferredParent: entryPoint.name
                        };
                    }));
                });
            });
        }));
    })

    .then(function () {
        // populate entryPointModules from allEntryPoints
        // based on determining conditional variations and associated modules
        // { name, deferredParent, conditions, modules }
        return Promise.all(allEntryPoints.map(function (entryPoint) {
            return builder.traceConditionalEnv(entryPoint.name, { conditions: options.conditions || {} })
            .then(function (conditionalEnv) {
                // remove set conditions from conditionalEnv
                Object.keys(options.conditions || {}).forEach(function (condition) {
                    delete conditionalEnv[condition];
                });

                // generate conditional combinations recursively (for general case of arbitrarily many conditional combinations)
                function generateVariationsOverConditions(conditionList) {
                    var curCondition = conditionList[0];

                    if (!curCondition) {
                        return [];
                    }

                    // get combinations from the n - 1th dimension
                    var nextVariations = generateVariationsOverConditions(conditionList.slice(1));

                    var variations = [];

                    if (!nextVariations.length) {
                        conditionalEnv[curCondition].forEach(function (curConditionValue) {
                            var variationConditions = {};
                            variationConditions[curCondition] = curConditionValue;
                            variations.push(variationConditions);
                        });
                    }

                    // multiply the combinations of the n - 1 dimention by the cominations of this nth dimension
                    nextVariations.forEach(function (nextVariation) {
                        conditionalEnv[curCondition].forEach(function (curConditionValue) {
                            var variationConditions = Object.assign({}, nextVariation);
                            variationConditions[curCondition] = curConditionValue;
                            variations.push(variationConditions);
                        });
                    });

                    return variations;
                }

                var conditionsCombinations = generateVariationsOverConditions(Object.keys(conditionalEnv));

                if (!conditionsCombinations.length) {
                    return getModuleTrace(entryPoint.name, { conditions: options.conditions || {}, traceResolvedConditionModules: false })
                    .then(function (modules) {
                        entryPointModules.push({
                            name: entryPoint.name,
                            deferredParent: entryPoint.deferredParent,
                            modules: modules
                        });
                    });
                }

                // trace conditional variations
                var conditionalVariations = [];
                entryPointModules.push({
                    name: entryPoint.name,
                    deferredParent: entryPoint.deferredParent,
                    conditionalVariations: conditionalVariations
                });
                return Promise.all(conditionsCombinations.map(function (conditions, index) {
                    return getModuleTrace(entryPoint.name, { conditions: Object.assign(Object.assign({}, conditions), options.conditions || {}), traceResolvedConditionModules: false })
                    .then(function (modules) {
                        conditionalVariations[index] = {
                            modules: modules,
                            conditions: conditions
                        };
                    });
                }));
            });
        }));
    })

    // We now have a four-layer optimization:
    // - common bundle
    // - manual bundles
    // - entry point bundle over all conditions
    // - entry point bundle over specific entry point condition
    // for each entry point, we remove the layers from the above
    // what we are left with is the entry point-specific bundle (if any)
    // we then populate entryPointBundles and bundles with this derivation
    .then(function () {
        // first we determine the common bundle
        var commonModules;
        var commonBundleName;

        // determine common modules
        entryPointModules.forEach(function (entryPoint) {
            // deferredParent modules not included in base-level common bundle
            if (entryPoint.deferredParent) {
                return;
            }

            if (entryPoint.modules) {
                if (!commonModules) {
                    commonModules = entryPoint.modules.concat([]);
                } else {
                    commonModules = intersectModules(commonModules, entryPoint.modules);
                }
            } else {
                entryPoint.conditionalVariations.forEach(function (variation) {
                    if (!commonModules) {
                        commonModules = variation.modules.concat([]);
                    } else {
                        commonModules = intersectModules(commonModules, variation.modules);
                    }
                });
            }
        });

        // subtract manual bundles from the common bundle
        if (commonModules && commonModules.length) {
            Object.keys(manualBundles).forEach(function (manualBundleName) {
                var manualBundleModules = manualBundles[manualBundleName];
                if (containsModules(commonModules, manualBundleModules)) {
                    commonModules = subtractModules(commonModules, manualBundleModules);
                }
            });
        }

        /*
         * Populate bundles and entryPointBundles
         */
        if (commonModules && commonModules.length) {
            bundles[commonBundleName = generateBundleName('common-bundle', commonModules)] = {
                modules: commonModules,
                source: undefined,
                sourceMap: undefined,
                assetList: undefined
            };
        }

        Object.keys(manualBundles).forEach(function (manualBundleName) {
            bundles[manualBundleName] = {
                modules: manualBundles[manualBundleName],
                source: undefined,
                sourceMap: undefined,
                assetList: undefined
            };
        });

        entryPointModules.forEach(function (entryPoint) {
            if (entryPoint.modules) {
                var entryPointBundleModules = entryPoint.modules;
                var entryPointBundleBundles = [];

                var entryPointBundle = {
                    name: entryPoint.name,
                    deferredParent: entryPoint.deferredParent,
                    conditions: undefined,
                    bundles: entryPointBundleBundles
                };

                // subtract common layer
                if (commonModules && commonModules.length && containsModules(entryPointBundleModules, commonModules)) {
                    entryPointBundleModules = subtractModules(entryPointBundleModules, commonModules);
                    entryPointBundleBundles.push(commonBundleName);
                }

                // subtract manual bundles
                Object.keys(manualBundles).forEach(function (manualBundle) {
                    var manualBundleModules = manualBundles[manualBundle];
                    if (containsModules(entryPointBundleModules, manualBundleModules)) {
                        entryPointBundleModules = subtractModules(entryPointBundleModules, manualBundleModules);
                        entryPointBundleBundles.push(manualBundle);
                    }
                });

                // if there is anything left over then we create the entry-point-specific bundle
                if (entryPointBundleModules.length) {
                    var bundleName = generateBundleName('bundle-' + entryPoint.name, entryPointBundleModules);
                    entryPointBundleBundles.push(bundleName);
                    bundles[bundleName] = {
                        modules: entryPointBundleModules,
                        source: undefined,
                        sourceMap: undefined,
                        assetList: undefined
                    };
                }

                entryPointBundles.push(entryPointBundle);

            // entry point has conditionals
            } else {
                var commonVariationModules;
                var commonVariationBundleName;

                // determine common variation modules
                entryPoint.conditionalVariations.forEach(function (variation) {
                    if (!commonVariationModules) {
                        commonVariationModules = variation.modules.concat([]);
                        return;
                    }
                    commonVariationModules = intersectModules(commonVariationModules, variation.modules);
                });

                // subtract common modules from common variation bundle
                if (commonVariationModules && commonVariationModules.length && commonModules && commonModules.length) {
                    if (containsModules(commonVariationModules, commonModules)) {
                        commonVariationModules = subtractModules(commonVariationModules, commonModules);
                    }
                }

                // subtract manual bundles from the common variation bundle
                if (commonVariationModules && commonVariationModules.length) {
                    Object.keys(manualBundles).forEach(function (manualBundleName) {
                        var manualBundleModules = manualBundles[manualBundleName];
                        if (containsModules(commonVariationModules, manualBundleModules)) {
                            commonVariationModules = subtractModules(commonVariationModules, manualBundleModules);
                        }
                    });
                }
                // save the common variation bundle
                if (commonVariationModules && commonVariationModules.length) {
                    bundles[commonVariationBundleName = 'common-' + generateBundleName(entryPoint.name, commonVariationModules)] = {
                        modules: commonVariationModules,
                        source: undefined,
                        sourceMap: undefined,
                        assetList: undefined
                    };
                }

                // create each variation bundle
                entryPoint.conditionalVariations.forEach(function (variation) {
                    var entryPointBundleModules = variation.modules;
                    var entryPointBundleBundles = [];

                    var entryPointBundle = {
                        name: entryPoint.name,
                        deferredParent: entryPoint.deferredParent,
                        conditions: variation.conditions,
                        bundles: entryPointBundleBundles
                    };

                    // subtract common layer
                    if (commonModules && commonModules.length && containsModules(entryPointBundleModules, commonModules)) {
                        entryPointBundleModules = subtractModules(entryPointBundleModules, commonModules);
                        entryPointBundleBundles.push(commonBundleName);
                    }

                    // subtract common variation layer
                    if (commonVariationModules && commonVariationModules.length && containsModules(entryPointBundleModules, commonVariationModules)) {
                        entryPointBundleModules = subtractModules(entryPointBundleModules, commonVariationModules);
                        entryPointBundleBundles.push(commonVariationBundleName);
                    }

                    // subtract manual bundles
                    Object.keys(manualBundles).forEach(function (manualBundle) {
                        var manualBundleModules = manualBundles[manualBundle];
                        if (containsModules(entryPointBundleModules, manualBundleModules)) {
                            entryPointBundleModules = subtractModules(entryPointBundleModules, manualBundleModules);
                            entryPointBundleBundles.push(manualBundle);
                        }
                    });

                    // if there is anything left over then we create the entry-point-variation-specific bundle
                    if (entryPointBundleModules.length) {
                        var bundleName = generateBundleName('bundle-' + entryPoint.name, entryPointBundleModules, variation.conditions);
                        entryPointBundleBundles.push(bundleName);
                        bundles[bundleName] = {
                            modules: entryPointBundleModules,
                            source: undefined,
                            sourceMap: undefined,
                            assetList: undefined
                        };
                    }

                    entryPointBundles.push(entryPointBundle);
                });
            }
        });
    })
    // finally, now that we have all bundles calculated, generate the bundle sources
    .then(function () {
        return Promise.all(Object.keys(bundles).map(function (bundleName) {
            var bundle = bundles[bundleName];

            return builder.bundle(bundle.modules, options)
            .then(function (output) {
                bundle.source = output.source;
                bundle.sourceMap = output.sourceMap;
                bundle.assetList = output.assetList;
            });
        }));
    })
    .then(function () {
        return {
            bundles: bundles,
            entryPointBundles: entryPointBundles
        };
    });
}

module.exports = function (options) {
    options = options || {};
    return function bundleSystemJs(assetGraph) {
        var potentiallyOrphanedAssetsById = {};
        var htmlScriptsToRemove = [];
        function cleanUp() {
            htmlScriptsToRemove.forEach(function (htmlScript) {
                var htmlAsset = htmlScript.from;
                htmlScript.detach();
                htmlAsset.markDirty();
            });

            // Clean up system.js assets if nothing is referring to them any more
            Object.keys(potentiallyOrphanedAssetsById).forEach(function (assetId) {
                var asset = potentiallyOrphanedAssetsById[assetId];
                if (assetGraph.findRelations({to: asset}).length === 0) {
                    assetGraph.removeAsset(asset);
                }
            });
        }

        // Parse a source map (if given as a string) and absolutify the urls in the sources array:
        function preprocessSourceMap(sourceMap) {
            if (typeof sourceMap === 'string') {
                sourceMap = JSON.parse(sourceMap);
            }
            if (sourceMap && Array.isArray(sourceMap.sources)) {
                sourceMap.sources = sourceMap.sources.map(function (sourceUrl) {
                    return urlTools.resolveUrl(assetGraph.root, sourceUrl.replace(/^\//, ''));
                });
            }
            return sourceMap;
        }

        var systemJsConfig = extractSystemJsConfig(assetGraph.findRelations({type: ['HtmlScript', 'JavaScriptWebWorker', 'JavaScriptImportScripts'], to: {isLoaded: true}}));
        var doneFirstConfigCall = false;
        var configStatements = systemJsConfig.configStatements.sort(function (a, b) {
            var aRelationsByPageId = {};
            var bRelationsByPageId = {};
            assetGraph.findRelations({to: a.asset}).forEach(function (incomingRelation) {
                (aRelationsByPageId[incomingRelation.from.id] = aRelationsByPageId[incomingRelation.from.id] || []).push(incomingRelation);
            });
            assetGraph.findRelations({to: b.asset}).forEach(function (incomingRelation) {
                (bRelationsByPageId[incomingRelation.from.id] = bRelationsByPageId[incomingRelation.from.id] || []).push(incomingRelation);
            });

            var pageIds = _.uniq(Object.keys(aRelationsByPageId).concat(Object.keys(bRelationsByPageId)));
            if (pageIds.every(function (pageId) {
                return ((aRelationsByPageId[pageId] || []).every(function (aRelation) {
                    return (bRelationsByPageId[pageId] || []).every(function (bRelation) {
                        return assetGraph._relations.indexOf(aRelation) <= assetGraph._relations.indexOf(bRelation);
                    });
                }));
            })) {
                return -1;
            } else if (pageIds.every(function (pageId) {
                return ((bRelationsByPageId[pageId] || []).every(function (bRelation) {
                    return (aRelationsByPageId[pageId] || []).every(function (aRelation) {
                        return assetGraph._relations.indexOf(bRelation) <= assetGraph._relations.indexOf(aRelation);
                    });
                }));
            })) {
                return 1;
            }
            throw new Error('System.config calls come in conflicting order across pages');
        });

        var topLevelSystemImportCalls = systemJsConfig.topLevelSystemImportCalls;
        var canonicalNames = _.uniq(topLevelSystemImportCalls.map(function (topLevelSystemImportCall) {
            return topLevelSystemImportCall.argumentString;
        }));

        assetGraph.findRelations({ type: 'HtmlScript' }, true).forEach(function (htmlScript) {
            var htmlAsset = htmlScript.from;
            var markDirty = false;
            if (htmlScript.node.hasAttribute('data-systemjs-polyfill')) {
                if (options.polyfill) {
                    new assetGraph.HtmlScript({
                        to: {
                            url: htmlScript.node.getAttribute('data-systemjs-polyfill') ||
                                (htmlScript.href || '').replace(/[^\/]*$/, 'system-polyfills.js')
                        }
                    }).attach(htmlScript.from, 'before', htmlScript);
                }
                htmlScript.node.removeAttribute('data-systemjs-polyfill');
                markDirty = true;
            }

            if (htmlScript.node.hasAttribute('data-systemjs-csp-production')) {
                var dataSystemJsCspProduction = htmlScript.node.getAttribute('data-systemjs-csp-production');
                potentiallyOrphanedAssetsById[htmlScript.to.id] = htmlScript.to;
                var href = dataSystemJsCspProduction || (htmlScript.href || '').replace(/[^\/]*$/, 'system-csp-production.js');
                htmlScript.to = { url: href };
                htmlScript.href = href;
                htmlScript.node.removeAttribute('data-systemjs-csp-production');
                markDirty = true;
            }
            if (markDirty) {
                htmlAsset.markDirty();
            }

            if (htmlScript.node.hasAttribute('data-systemjs-remove')) {
                potentiallyOrphanedAssetsById[htmlScript.to.id] = htmlScript.to;
                htmlScriptsToRemove.push(htmlScript);
            }
        });

        if (canonicalNames.length === 0) {
            cleanUp();
            return;
        }

        var entryPointInfosByPageId = {};
        var occurrences = [];

        topLevelSystemImportCalls.forEach(function (topLevelSystemImportCall) {
            var asset = topLevelSystemImportCall.asset;
            assetGraph.findRelations({ type: ['JavaScriptWebWorker', 'HtmlScript'], to: asset }).forEach(function (incomingRelation) {
                var page = incomingRelation.from;
                var occurrence = _.defaults({
                    page: page,
                    incomingRelation: incomingRelation
                }, topLevelSystemImportCall);
                occurrences.push(occurrence);
                (entryPointInfosByPageId[page.id] = entryPointInfosByPageId[page.id] || []).push(occurrence);
            });
        });

        var pagesWithEntryPoints = Object.keys(entryPointInfosByPageId).map(function (pageId) {
            return assetGraph.findAssets({ id: pageId })[0];
        });

        var manualBundles = {};

        configStatements.forEach(function (configStatement, i) {
            configStatement.obj = esanimate.objectify(configStatement.node.arguments[0]);
            if (configStatement.obj.manualBundles) {
                Object.keys(configStatement.obj.manualBundles).forEach(function (bundleId) {
                    if (manualBundles[bundleId]) {
                        if (!_.isEqual([].concat(manualBundles[bundleId]).sort(), [].concat(configStatement.obj.manualBundles[bundleId]).sort())) {
                            throw new Error('Conflicting definitions of the manual bundle ' + bundleId);
                        }
                    } else {
                        manualBundles[bundleId] = configStatement.obj.manualBundles[bundleId];
                    }
                });
            }

            var dirty = false;
            var objectLiteralNode = configStatement.node.arguments[0];
            objectLiteralNode.properties = objectLiteralNode.properties.filter(function (propertyNode) {
                if (propertyNode.key.type === 'Identifier' && (propertyNode.key.name === 'buildConfig' || propertyNode.key.name === 'testConfig')) {
                    dirty = true;
                    return false;
                } else {
                    return true;
                }
            });
            if (objectLiteralNode.properties.length === 0) {
                var parentBody = configStatement.parentNode.body || configStatement.parentNode.expressions;
                parentBody.splice(parentBody.indexOf(configStatement.detachableNode), 1);
                dirty = true;
            }
            if (dirty) {
                configStatement.asset.markDirty();
            }
        });

        function isConfigIncludedOnEveryPage(configStatement) {
            return pagesWithEntryPoints.every(function (pageWithEntryPoint) {
                return assetGraph.findRelations({from: pageWithEntryPoint, to: configStatement.asset}).length > 0;
            });
        }

        configStatements.forEach(function (configStatement, i) {
            if (!isConfigIncludedOnEveryPage(configStatement) && configStatements.some(function (otherConfigStatement, j) {
                return detectSystemJSConflict(configStatement.obj, otherConfigStatement.obj);
            })) {
                throw new Error('Configs conflict');
            }
        });

        var SystemJsBuilder;
        try {
            SystemJsBuilder = require('systemjs-builder');
        } catch (e) {
            throw new Error(
                'The graph contains ' + topLevelSystemImportCalls.length + ' top-level System.import call' + (topLevelSystemImportCalls.length === 1 ? '' : 's') +
                ', but systemjs-builder is not available. Please install systemjs-builder 0.14.9+ in the the containing project.'
            );
        }

        var builder = new SystemJsBuilder();
        configStatements.forEach(function (configStatement) {
            if (configStatement.obj.baseURL) {
                if (!/^\//.test(configStatement.obj.baseURL)) {
                    throw new Error('the System.js baseURL must be absolute');
                }
                configStatement.obj.baseURL = urlTools.resolveUrl(assetGraph.root, configStatement.obj.baseURL.replace(/^\//, ''));
            } else if (!doneFirstConfigCall) {
                configStatement.obj.baseURL = assetGraph.root;
            }
            builder.config(_.clone(configStatement.obj, true));
            doneFirstConfigCall = true;
        });
        var entryPointNames = _.uniq(topLevelSystemImportCalls.map(function (topLevelSystemImportCall) {
            return topLevelSystemImportCall.argumentString;
        }));

        var bundleStrategyOptions = {
            production: true,
            normalize: true,
            traceConditionModules: !options.conditions,
            inlineSingularConditions: options.conditions,
            deferredImports: options.deferredImports,
            manualBundles: manualBundles,
            sourceMaps: true,
            assetRoot: assetGraph.root,
            inlinePlugins: false // Skip inlining resources like css, handled through the asset list
        };

        if (typeof options.conditions !== 'undefined') {
            bundleStrategyOptions.conditions = options.conditions;
        }

        return bundleStrategy(builder, entryPointNames.map(function (entryPointName) {
            return { name: entryPointName };
        }), bundleStrategyOptions).then(function (result) {
            var isSeenByPageIdAndBundleId = {};

            var attachAssetsPromises = [];
            Object.keys(entryPointInfosByPageId).forEach(function (pageId) {
                isSeenByPageIdAndBundleId[pageId] = {};
                entryPointInfosByPageId[pageId].forEach(function (occurrence, i) {
                    result.entryPointBundles.filter(function (entryPointBundlesEntry) {
                        return entryPointBundlesEntry.name === occurrence.argumentString && !entryPointBundlesEntry.deferredParent;
                    }).forEach(function (entryPointBundle) {
                        var conditions = entryPointBundle.conditions || {};
                        var bundleIds = entryPointBundle.bundles;
                        bundleIds.forEach(function (bundleId) {
                            if (!isSeenByPageIdAndBundleId[pageId][bundleId]) {
                                var bundle = result.bundles[bundleId];
                                isSeenByPageIdAndBundleId[pageId][bundleId] = true;
                                var nextSuffixToTry = 0;
                                var bundleUrl;
                                do {
                                    bundleUrl = assetGraph.root + bundleId + (nextSuffixToTry ? '-' + nextSuffixToTry : '') + '.js';
                                    nextSuffixToTry += 1;
                                } while (assetGraph.findAssets({url: bundleUrl}).length > 0);
                                var bundleAsset = new AssetGraph.JavaScript({
                                    text: bundle.source,
                                    url: bundleUrl,
                                    sourceMap: preprocessSourceMap(bundle.sourceMap)
                                });
                                var addBundleToGraph = true;
                                if (occurrence.incomingRelation.type === 'JavaScriptWebWorker') {
                                    var currentImportScripts = assetGraph.findRelations({type: 'JavaScriptImportScripts', from: occurrence.incomingRelation.to});
                                    var importScriptsRelation = new AssetGraph.JavaScriptImportScripts({to: bundleAsset});
                                    if (currentImportScripts.length > 0) {
                                        importScriptsRelation.attach(occurrence.incomingRelation.to, 'after', currentImportScripts[currentImportScripts.length - 1]);
                                    } else {
                                        importScriptsRelation.attach(occurrence.incomingRelation.to, 'first');
                                    }
                                } else {
                                    // assume 'HtmlScript'
                                    if (htmlScriptsToRemove.indexOf(occurrence.incomingRelation) === -1) {
                                        var htmlScript = new AssetGraph.HtmlScript({
                                            to: bundleAsset
                                        });
                                        htmlScript.attach(occurrence.incomingRelation.from, 'before', occurrence.incomingRelation);
                                        var keys = Object.keys(conditions);
                                        if (bundleId !== 'common-bundle' && keys.length > 0) {
                                            htmlScript.node.setAttribute('data-systemjs-conditionals', keys.map(function (key) {
                                                return (/[^a-z]/.test(key) ? singleQuoteString(key) : key) + ': ' + singleQuoteString(conditions[key]);
                                            }).join(', '));
                                            htmlScript.from.markDirty();
                                        }
                                    } else {
                                        // The script containing the entry point is marked for removal, don't add the bundle to the graph
                                        addBundleToGraph = false;
                                    }
                                }

                                if (addBundleToGraph) {
                                    assetGraph.addAsset(bundleAsset);
                                }

                                Array.prototype.push.apply(attachAssetsPromises, (bundle.assetList || []).map(function (assetListEntry) {
                                    var assetConfig = {
                                        url: assetListEntry.url,
                                        sourceMap: assetListEntry.sourceMap
                                    };
                                    if (assetListEntry.type === 'css') {
                                        assetConfig.type = 'Css';
                                    }
                                    if (typeof assetListEntry.source === 'string') {
                                        assetConfig.text = assetListEntry.source;
                                    }
                                    var asset = assetGraph.createAsset(assetGraph.resolveAssetConfig(assetConfig, assetGraph.root));

                                    assetGraph.addAsset(asset);
                                    if (addBundleToGraph) {
                                        assetGraph.addRelation(new AssetGraph.SystemJsBundle({
                                            hrefType: 'rootRelative',
                                            from: bundleAsset,
                                            to: asset
                                        }));
                                    } else if (asset.type === 'Css') {
                                        new AssetGraph.HtmlStyle({
                                            hrefType: 'rootRelative',
                                            to: asset
                                        }).attach(occurrence.incomingRelation.from, 'last');
                                    } else {
                                        assetGraph.emit(new Error('Cannot attach relation to ' + asset.urlOrDescription + ' when the <script> containing the entry point has the data-systemjs-remove property'));
                                    }
                                    return asset.load();
                                }));
                            }
                        });
                    });
                });
            });
            result.entryPointBundles.filter(function (entryPointBundle) {
                return entryPointBundle.deferredParent;
            }).forEach(function (entryPointBundle) {
                var deferredParent = entryPointBundle.deferredParent;

                // Find the occurrence object corresponding to the parent
                // entry point of the deferred System.import:
                var parentOccurrence;
                occurrences.some(function (occurrence) {
                    if (occurrence.argumentString === deferredParent) {
                        parentOccurrence = occurrence;
                        return true;
                    }
                });
                if (!parentOccurrence) {
                    throw new Error('No parent occurrence found for deferredParent: ' + deferredParent);
                }
                var configBundleArgument = {};
                entryPointBundle.bundles.forEach(function (bundleId) {
                    // FIXME: Dedupe, no need to mention already seen bundles in the injected System.config
                    configBundleArgument[bundleId] = result.bundles[bundleId].modules;
                });

                var configBundleArgumentAst = esanimate.astify({ bundles: configBundleArgument });

                var configScript = new AssetGraph.JavaScript({
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
                                    arguments: [ configBundleArgumentAst ]
                                }
                            }
                        ]
                    }
                });
                assetGraph.addAsset(configScript);
                new AssetGraph.HtmlScript({
                    to: configScript
                }).attach(parentOccurrence.incomingRelation.from, 'before', parentOccurrence.incomingRelation);
                entryPointBundle.bundles.forEach(function (bundleId) {
                    if (!isSeenByPageIdAndBundleId[parentOccurrence.page.id][bundleId]) {
                        var bundle = result.bundles[bundleId];
                        isSeenByPageIdAndBundleId[parentOccurrence.page.id][bundleId] = true;
                        var bundleAsset = new AssetGraph.JavaScript({
                            text: bundle.source,
                            url: bundleId + '.js',
                            sourceMap: preprocessSourceMap(bundle.sourceMap)
                        });
                        assetGraph.addAsset(bundleAsset);
                        var node;
                        configBundleArgumentAst.properties[0].value.properties.some(function (propertyNode) {
                            if ((propertyNode.key.name || propertyNode.key.value) === bundleId) {
                                node = propertyNode;
                                return true;
                            }
                        });
                        new AssetGraph.SystemJsLazyBundle({
                            from: configScript,
                            to: bundleAsset,
                            node: node
                        }).attach(configScript, 'last');
                    }
                });
            });
            return Promise.all(attachAssetsPromises);
        }).then(cleanUp);
    };
};

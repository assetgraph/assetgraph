/*jshint unused:false*/
var _ = require('lodash'),
    Promise = require('bluebird'),
    passError = require('passerror'),
    esanimate = require('esanimate'),
    estraverse = require('estraverse'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

function extractSystemJsConfig(htmlScripts) {
    var systemJsConfig = {
        configStatements: [],
        topLevelSystemImportCalls: []
    };
    htmlScripts.forEach(function (htmlScript) {
        var seenConfig = false;
        var seenImport = false;
        estraverse.traverse(htmlScript.to.parseTree, {
            enter: function (node) {
                if (node.type === 'CallExpression' &&
                    node.callee.type === 'MemberExpression' &&
                    !node.callee.computed &&
                    node.callee.object.type === 'Identifier' &&
                    node.callee.object.name === 'System' &&
                    node.callee.property.type === 'Identifier' &&
                    node.arguments.length === 1) {

                    if (node.callee.property.name === 'config') {
                        seenConfig = true;
                        systemJsConfig.configStatements.push({ asset: htmlScript.to, node: node });
                    } else if (node.callee.property.name === 'import') {
                        seenImport = true;
                        systemJsConfig.topLevelSystemImportCalls.push({
                            argumentString: node.arguments[0].value,
                            asset: htmlScript.to,
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
 */
function bundleStrategy(builder, entryPoints, options) {
    var originalEntryPoints = entryPoints;

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
    var bundleNames = [];
    function generateBundleName(moduleName) {
        var shortName = moduleName.split('/').pop();
        var dotIndex = shortName.lastIndexOf('.');
        if (dotIndex > 0) {
            shortName = shortName.substr(0, dotIndex);
        }
        var bundleName = 'bundle-' + shortName.replace(/[- \.]/g, '').toLowerCase();
        var i;
        if (bundleNames.indexOf(bundleName) !== -1) {
            i = 1;
            while (bundleNames.indexOf(bundleName + '-' + i) === -1) {
                i += 1;
            }
        }
        return bundleName + (i ? '-' + i : '');
    }

    function hasModules(tree) {
        return Object.keys(tree).some(function (moduleName) {
            return tree[moduleName];
        });
    }

    var outObj = {
        entryPointBundles: [],
        bundles: {}
    };

    var commonTree;
    var manualTrees = {};
    var traces;

    return Promise.all(entryPoints.map(function (entryPoint, index) {
        outObj.entryPointBundles[index] = {
            name: entryPoint.name,
            bundles: [],
            deferredParent: entryPoint.deferredParent
        };
        return builder.trace(entryPoint.name, options);
    })).then(function (_traces) {
        traces = _traces;

        // intersect common bundle tree
        commonTree = builder.addTrees({}, traces[0]);

        traces.forEach(function (trace) {
            commonTree = builder.intersectTrees(commonTree, trace);
        });

        // determine the deferred System.import statements for each trace
        function addDeferredEntryPoints(trace, deferredParent) {
            return builder.getDeferredImports(trace).then(function (deferredImports) {
                var newEntryPoints = [];

                deferredImports.forEach(function (deferredImport) {
                    // we allow deferred entry points to duplicate across pages
                    newEntryPoints.push({
                        name: deferredImport.name,
                        deferredParent: deferredParent
                    });
                });

                entryPoints = entryPoints.concat(newEntryPoints);

                return Promise.all(newEntryPoints.map(function (entryPoint, index) {
                    outObj.entryPointBundles.push({
                        name: entryPoint.name,
                        bundles: [],
                        deferredParent: deferredParent
                    });
                    return builder.trace(entryPoint.name, options).then(function (trace) {
                        traces.push(trace);
                    });
                }));
            });
        }

        if (options.deferredImports) {
            return Promise.all(traces.map(function (trace, index) {
                return addDeferredEntryPoints(trace, originalEntryPoints[index].name);
            }));
        }
    }).then(function () {
        return Promise.resolve().then(function () {
            // create manual bundles
            if (!options.manualBundles) {
                return;
            }
            return Promise.all(Object.keys(options.manualBundles).map(function (manualBundle) {
                var bundleModules = options.manualBundles[manualBundle];

                return builder.bundle('[' + bundleModules.join('] + [') + ']', options).then(function (output) {
                    // subtract each manual bundle tree from the common tree
                    commonTree = builder.subtractTrees(commonTree, output.tree);

                    manualTrees[manualBundle] = output.tree;

                    outObj.bundles[manualBundle] = {
                        source: output.source,
                        sourceMap: output.sourceMap,
                        modules: output.modules,
                        assetList: output.assetList
                    };
                });
            }));
        }).then(function () {
            // create common bundle tree if it has modules
            // remove any manual bundle modules from the common tree
            if (hasModules(commonTree)) {
                return builder.bundle(commonTree, options).then(function (output) {
                    outObj.bundles['common-bundle'] = {
                        source: output.source,
                        sourceMap: output.sourceMap,
                        modules: output.modules,
                        assetList: output.assetList
                    };
                    outObj.entryPointBundles.forEach(function (entryPointBundle, index) {
                        // common bundles associates with critical loads
                        if (!entryPoints[index].deferredParent) {
                            entryPointBundle.bundles.push('common-bundle');
                        }
                    });
                });
            }
        }).then(function () {
            // create bundles for each entry point, subtracting their existing common and manual bundles
            return Promise.all(traces.map(function (trace, index) {
                var entryPoint = entryPoints[index];

                if (entryPoint.deferredParent) {
                    return;
                }

                // remove common tree
                var moduleTree = builder.subtractTrees(trace, commonTree);

                Object.keys(manualTrees).forEach(function (bundleName) {
                    var manualTree = manualTrees[bundleName];

                    if (!manualTree || manualTree.conditional) {
                        return;
                    }

                    // remove any manual bundles that are completely contained in the bundle
                    // that manual bundle is then linked to this entry point
                    if (!Object.keys(manualTree).some(function (moduleName) {
                        return !moduleTree[moduleName];
                    })) {
                        moduleTree = builder.subtractTrees(moduleTree, manualTree);
                        outObj.entryPointBundles[index].bundles.push(bundleName);
                    }
                });

                if (hasModules(moduleTree)) {
                    return builder.bundle(moduleTree, options).then(function (output) {
                        var bundleName = generateBundleName(entryPoint.name);
                        outObj.entryPointBundles[index].bundles.push(bundleName);
                        outObj.bundles[bundleName] = {
                            source: output.source,
                            sourceMap: output.sourceMap,
                            modules: output.modules,
                            assetList: output.assetList
                        };
                    });
                }
            }));
        }).then(function () {
            // create bundles for each deferred entry point, subtracting the common tree, deferredParent tree
            // and then any manual bundles
            return Promise.all(traces.map(function (trace, index) {
                var entryPoint = entryPoints[index];

                if (!entryPoint.deferredParent) {
                    return;
                }

                var deferredParentEntryPointIndex;
                entryPoints.forEach(function (e, index) {
                    if (e.name === entryPoint.deferredParent) {
                        deferredParentEntryPointIndex = index;
                    }
                });

                if (typeof deferredParentEntryPointIndex === 'undefined') {
                    throw new Error('Entry point ' + entryPoint.name + ' has deferred parent entry point ' + entryPoint.deferredParent + ', which is not an entry point itself.');
                }

                // remove common tree
                var moduleTree = builder.subtractTrees(trace, commonTree);

                // remove deferred parent tree
                moduleTree = builder.subtractTrees(moduleTree, traces[deferredParentEntryPointIndex]);

                Object.keys(manualTrees).forEach(function (bundleName) {
                    var manualTree = manualTrees[bundleName];

                    if (!manualTree || manualTree.conditional) {
                        return;
                    }

                    // remove any manual bundles that are completely contained in the bundle
                    // that manual bundle is then linked to this entry point
                    if (!Object.keys(manualTree).some(function (moduleName) {
                        return !moduleTree[moduleName];
                    })) {
                        moduleTree = builder.subtractTrees(moduleTree, manualTree);
                        outObj.entryPointBundles[index].bundles.push(bundleName);
                    }
                });

                if (hasModules(moduleTree)) {
                    return builder.bundle(moduleTree, options).then(function (output) {
                        var bundleName = generateBundleName(entryPoint.name);
                        outObj.entryPointBundles[index].bundles.push(bundleName);
                        outObj.bundles[bundleName] = {
                            source: output.source,
                            sourceMap: output.sourceMap,
                            modules: output.modules,
                            assetList: output.assetList
                        };
                    });
                }
            }));
        });
    }).then(function () {
        return outObj;
    });
}

module.exports = function (options) {
    options = options || {};
    return function bundleSystemJs(assetGraph) {
        var potentiallyOrphanedAssetsById = {};

        assetGraph.findRelations({ type: 'HtmlScript' }, true).forEach(function (htmlScript) {
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
                htmlScript.from.markDirty();
            }

            if (htmlScript.node.hasAttribute('data-systemjs-replacement')) {
                var dataSystemJsReplacementValue = htmlScript.node.getAttribute('data-systemjs-replacement');
                potentiallyOrphanedAssetsById[htmlScript.to.id] = htmlScript.to;
                htmlScript.href = dataSystemJsReplacementValue;
                htmlScript.to = { url: dataSystemJsReplacementValue };
                htmlScript.node.removeAttribute('data-systemjs-replacement');
                htmlScript.from.markDirty();
            }
        });

        // Clean up require.js assets if nothing is referring to them any more
        Object.keys(potentiallyOrphanedAssetsById).forEach(function (assetId) {
            var asset = potentiallyOrphanedAssetsById[assetId];
            if (assetGraph.findRelations({to: asset}).length === 0) {
                assetGraph.removeAsset(asset);
            }
        });

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

        var systemJsConfig = extractSystemJsConfig(assetGraph.findRelations({type: 'HtmlScript', to: {isLoaded: true}}));
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
        if (canonicalNames.length === 0) {
            return;
        }

        var entryPointInfosByPageId = {};
        var occurrences = [];

        topLevelSystemImportCalls.forEach(function (topLevelSystemImportCall) {
            var asset = topLevelSystemImportCall.asset;
            assetGraph.findRelations({ type: 'HtmlScript', from: { type: 'Html' }, to: asset }).forEach(function (incomingRelation) {
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
            deferredImports: options.deferredImports,
            manualBundles: manualBundles,
            sourceMaps: true,
            assetRoot: assetGraph.root
        };

        return bundleStrategy(builder, entryPointNames.map(function (entryPointName) {
            return { name: entryPointName };
        }), bundleStrategyOptions).then(function (result) {
            var isSeenByPageIdAndBundleId = {};

            var attachAssetsPromises = [];
            Object.keys(entryPointInfosByPageId).forEach(function (pageId) {
                isSeenByPageIdAndBundleId[pageId] = {};
                entryPointInfosByPageId[pageId].forEach(function (occurrence, i) {
                    var entryPointBundles = result.entryPointBundles.filter(function (entryPointBundlesEntry) {
                        return entryPointBundlesEntry.name === occurrence.argumentString && !entryPointBundlesEntry.deferredParent;
                    });
                    if (entryPointBundles.length !== 1) {
                        throw new Error('Unexpected number of non-deferred entryPointBundles entry for ' + occurrence.argumentString);
                    }
                    var entryPointBundle = entryPointBundles[0];
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
                            new AssetGraph.HtmlScript({
                                to: bundleAsset
                            }).attach(occurrence.incomingRelation.from, 'before', occurrence.incomingRelation);
                            assetGraph.addAsset(bundleAsset);

                            Array.prototype.push.apply(attachAssetsPromises, (bundle.assetList || []).map(function (assetListEntry) {
                                var assetConfig = {
                                    url: assetListEntry.url,
                                    sourceMap: assetListEntry.sourceMap
                                };
                                if (typeof assetListEntry.source === 'string') {
                                    assetConfig.text = assetListEntry.source;
                                }
                                return new Promise(function (resolve, reject) {
                                    assetGraph.resolveAssetConfig(assetConfig, assetGraph.root, passError(reject, function (resolvedAssetConfig) {
                                        var asset = assetGraph.createAsset(resolvedAssetConfig);
                                        assetGraph.addAsset(asset);
                                        assetGraph.addRelation(new AssetGraph.SystemJsBundle({
                                            from: bundleAsset,
                                            to: asset
                                        }));
                                        asset.load(passError(reject, function () {
                                            resolve();
                                        }));
                                    }));
                                });
                            }));
                        }
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
        });
    };
};

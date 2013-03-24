var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    vm = require('vm'),
    uglifyJs = require('uglify-js'),
    uglifyAst = require('uglifyast');

module.exports = function (queryObj) {
    return function bundleRequireJs(assetGraph) {
        var requireJsConfig = assetGraph.requireJsConfig,
            assetsToCleanUp = [];
        if (!requireJsConfig) {
            throw new Error('transforms.bundleRequireJs: No assetGraph.requireJsConfig found, please run transforms.registerRequireJsConfig first');
        }
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            var existingHtmlStyleRelations = assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}, true), // includeUnpopulated
                htmlStyleInsertionPoint;
            if (existingHtmlStyleRelations.length > 0) {
                htmlStyleInsertionPoint = existingHtmlStyleRelations[existingHtmlStyleRelations.length - 1];
            }

            assetGraph.findRelations({from: htmlAsset, type: ['HtmlRequireJsMain', 'HtmlScript']}).forEach(function (startRelation) {

                // Don't do anything for regular scripts that don't use require:
                if (startRelation.type === 'HtmlScript' && assetGraph.findRelations({from: startRelation.to, type: 'JavaScriptAmdRequire'}).length === 0) {
                    return;
                }

                var fallbackBaseUrl = (startRelation.to.url || htmlAsset.url).replace(/[^\/]+$/, ''),
                    outgoingRelations = [],
                    assetsToBundle = [],
                    bundleTopLevelStatements = [];

                function getModuleName(asset) {
                    return requireJsConfig.getModuleName(asset, fallbackBaseUrl);
                }

                assetGraph.eachAssetPostOrder(startRelation, {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine', 'JavaScriptShimRequire'], to: {type: 'JavaScript'}}, function (asset) {
                    if (!asset.isLoaded) {
                        return;
                    }
                    var clonedAsset = asset.clone();
                    assetsToCleanUp.push(asset);
                    assetsToBundle.push(clonedAsset);
                    assetGraph.findRelations({from: clonedAsset}, true).forEach(function (outgoingRelation) {
                        var injectGetText = false,
                            injectDefineStatementValueAst;
                        if (/^JavaScript(?:ShimRequire|Amd(?:Define|Require))$/.test(outgoingRelation.type)) {
                            if (outgoingRelation.to.type === 'JavaScript') {
                                var targetModuleName = getModuleName(outgoingRelation.to);
                                if (outgoingRelation.to._notAmd && targetModuleName !== 'jquery' && // require-jquery.js special cases 'jquery'
                                    (!requireJsConfig.shim[targetModuleName] || !requireJsConfig.shim[targetModuleName].exports)) {

                                    outgoingRelation.detach();
                                } else {
                                    assetGraph.removeRelation(outgoingRelation);
                                }
                            } else if (outgoingRelation.to.type === 'Css' || outgoingRelation.to.type === 'Less') {
                                var newHtmlStyle = new assetGraph.HtmlStyle({to: outgoingRelation.to});
                                if (htmlStyleInsertionPoint) {
                                    newHtmlStyle.attach(htmlAsset, 'after', htmlStyleInsertionPoint);
                                } else {
                                    newHtmlStyle.attach(htmlAsset, 'first');
                                }
                                htmlStyleInsertionPoint = newHtmlStyle;
                                outgoingRelation.detach();
                            } else if (outgoingRelation.to.isText) {
                                injectDefineStatementValueAst = new uglifyJs.AST_Call({
                                    expression: new uglifyJs.AST_SymbolRef({name: 'GETTEXT'}),
                                    args: [
                                        new uglifyJs.AST_String({value: '<urlGoesHere>'})
                                    ]
                                });
                                injectGetText = true;
                            } else {
                                assetGraph.emit('warn', new Error("bundleRequireJs: Skipping unsupported outgoing relation: " + outgoingRelation.toString()));
                            }
                            if (injectDefineStatementValueAst) {
                                var callNode = new uglifyJs.AST_Call({
                                    expression: new uglifyJs.AST_SymbolRef({name: 'define'}),
                                    args: [
                                        new uglifyJs.AST_String(getModuleName(outgoingRelation.to)),
                                        injectDefineStatementValueAst
                                    ]
                                });
                                bundleTopLevelStatements.push(new uglifyJs.AST_SimpleStatement({body: callNode}));

                                if (injectGetText) {
                                    var oneGetTextRelation = new assetGraph.JavaScriptGetText({
                                        parentNode: callNode,
                                        node: injectDefineStatementValueAst,
                                        from: clonedAsset,
                                        to: outgoingRelation.to
                                    });
                                    outgoingRelations.push(oneGetTextRelation);
                                    outgoingRelation.node.value = outgoingRelation.node.value.replace(/^text!/, "");
                                }
                            }
                        } else {
                            // Ugly hack to make sure that the parentNode property of top-level INCLUDEs end up pointing at the
                            // bundle asset's top level statements array:
                            if (outgoingRelation.type === 'JavaScriptInclude' && outgoingRelation.parentNode === outgoingRelation.from.parseTree[1]) {
                                outgoingRelation.parentNode = bundleTopLevelStatements;
                            }
                            outgoingRelations.push(outgoingRelation);
                        }
                    });

                    // Check for existing define() statements:
                    var hasFoundPlausibleDefineStatementValueAst = false,
                        topLevelStatements = clonedAsset.parseTree.body,
                        dependencyArrayAst,
                        injectDefineStatementValueAst;

                    if (topLevelStatements.length === 1 &&
                        topLevelStatements[0] instanceof uglifyJs.AST_SimpleStatement &&
                        topLevelStatements[0].body instanceof uglifyJs.AST_Call &&
                        topLevelStatements[0].body.expression instanceof uglifyJs.AST_Function &&
                        topLevelStatements[0].body.expression.body.length === 1 &&
                        topLevelStatements[0].body.expression.body[0] instanceof uglifyJs.AST_If) {

                        var numDefineStatements = 0;

                        topLevelStatements[0].body.expression.walk(new uglifyJs.TreeWalker(function (node) {
                            if (node instanceof uglifyJs.AST_SymbolRef && node.name === 'define') {
                                numDefineStatements += 1;
                            }
                        }));

                        if (numDefineStatements === 1) {
                            var context = vm.createContext(),
                                dependencyArray,
                                factory;
                            context.define = function () {
                                if (arguments.length > 0 && typeof arguments[arguments.length - 1] === 'function') {
                                    factory = arguments[arguments.length - 1];
                                    if (arguments.length > 1 && Array.isArray(arguments[arguments.length - 2])) {
                                        dependencyArray = arguments[arguments.length - 2];
                                    }
                                }
                            };
                            context.define.amd = {jQuery: true, multiversion: true, plugins: true};

                            try {
                                vm.runInContext(topLevelStatements[0].print_to_string(), context);
                            } catch (e) {
                                factory = false;
                            }
                            if (factory) {
                                injectDefineStatementValueAst = uglifyAst.objToAst(factory);
                                dependencyArrayAst = dependencyArray && uglifyAst.objToAst(dependencyArray);
                                topLevelStatements = clonedAsset.parseTree.body = [];
                                hasFoundPlausibleDefineStatementValueAst = true;
                            }
                        }
                    }
                    if (!hasFoundPlausibleDefineStatementValueAst) {
                        var callDefineAsts = [];
                        clonedAsset.parseTree.walk(new uglifyJs.TreeWalker(function (node) {
                            if (node instanceof uglifyJs.AST_Call &&
                                node.expression instanceof uglifyJs.AST_SymbolRef && node.expression.name === 'define') {

                                callDefineAsts.push(node);
                            }
                        }));
                        if (callDefineAsts.length === 1) {
                            var moduleName = getModuleName(asset);
                            if (moduleName) {
                                if (asset === startRelation.to) {
                                    // Strip "scripts/" prefix of the main module (hmm, not sure?)
                                    moduleName = moduleName.replace(/^.*\//, "");
                                }
                                var firstArgumentIsString = callDefineAsts[0].args.length > 0 && callDefineAsts[0].args[0] instanceof uglifyJs.AST_String;
                                callDefineAsts[0].args.splice(0, firstArgumentIsString ? 1 : 0, new uglifyJs.AST_String({value: moduleName}));
                            }
                            injectDefineStatementValueAst = null;
                            hasFoundPlausibleDefineStatementValueAst = true;
                        }
                    }
                    if (injectDefineStatementValueAst) {
                        var defineArgsAst = [new uglifyJs.String({value: getModuleName(asset)})];
                        if (dependencyArrayAst) {
                            defineArgsAst.push(dependencyArrayAst);
                        }
                        defineArgsAst.push(injectDefineStatementValueAst);

                        bundleTopLevelStatements.push(new uglifyJs.AST_SimpleStatement({
                            body: new uglifyJs.AST_Call({
                                expression: new uglifyJs.AST_SymbolRef({name: 'define'}),
                                args: defineArgsAst
                            })
                        }));
                    }
                    if (!hasFoundPlausibleDefineStatementValueAst) {
                        asset._notAmd = true;
                    }
                    Array.prototype.push.apply(bundleTopLevelStatements, clonedAsset.parseTree.body);
                });
                startRelation.to.replaceWith(new assetGraph.JavaScript({
                    url: startRelation.to.url,
                    parseTree: new uglifyJs.AST_Toplevel({body: bundleTopLevelStatements}),
                    outgoingRelations: outgoingRelations
                }));
                outgoingRelations.forEach(function (outgoingRelation) {
                    outgoingRelation.refreshHref();
                });
                assetsToBundle.forEach(function (asset) {
                    assetGraph.removeAsset(asset);
                });
            });
        });
        assetsToCleanUp.forEach(function (asset) {
            if (asset.assetGraph && asset.incomingRelations.every(function (incomingRelation) {return assetsToCleanUp.indexOf(incomingRelation.from) !== -1;})) {
                assetGraph.removeAsset(asset);
            }
        });
        assetGraph.recomputeBaseAssets(true);
    };
};

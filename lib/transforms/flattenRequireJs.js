var _ = require('lodash'),
    Path = require('path'),
    AssetGraph = require('../'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst,
    requireJsRelationTypes = ['JavaScriptAmdRequire', 'JavaScriptAmdDefine', 'JavaScriptShimRequire', 'JavaScriptRequireJsCommonJsCompatibilityRequire'];

module.exports = function (queryObj) {
    return function flattenRequireJs(assetGraph) {
        var requireJsConfig = assetGraph.requireJsConfig;
        if (!requireJsConfig) {
            assetGraph.emit('warn', new Error('transforms.flattenRequireJs: No assetGraph.requireJsConfig found, please run transforms.registerRequireJsConfig first'));
            return;
        }
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            var existingHtmlStyleRelations = assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}, true), // includeUnpopulated
                htmlStyleInsertionPoint;
            if (existingHtmlStyleRelations.length > 0) {
                htmlStyleInsertionPoint = existingHtmlStyleRelations[existingHtmlStyleRelations.length - 1];
            }

            assetGraph.findRelations({from: htmlAsset, type: ['HtmlRequireJsMain', 'HtmlScript']}).forEach(function (startRelation) {

                // Don't do anything for regular scripts that don't use require:
                if (startRelation.type === 'HtmlScript' && assetGraph.findRelations({from: startRelation.to, type: requireJsRelationTypes}).length === 0) {
                    return;
                }

                var htmlScriptInsertionPoint = startRelation,
                    fallbackBaseUrl = (startRelation.to.url || htmlAsset.url).replace(/[^\/]+$/, ''),
                    nonJavaScriptModuleNameByUrl = {},
                    canonicalModuleNameByUrl = {};

                function addHtmlScript(javaScript) {
                    var htmlScript = new AssetGraph.HtmlScript({
                            from: htmlAsset,
                            to: javaScript
                        });
                    if (javaScript.assetGraph) {
                        assetGraph.removeAsset(javaScript);
                    }
                    assetGraph.addAsset(javaScript);
                    htmlScript.attach(htmlAsset, 'after', htmlScriptInsertionPoint);
                    htmlScriptInsertionPoint = htmlScript;
                }

                function getModuleName(asset) {
                    if (asset.url in canonicalModuleNameByUrl) {
                        return canonicalModuleNameByUrl[asset.url];
                    }
                    var canonicalModuleName;
                    assetGraph.findRelations({to: asset, type: requireJsRelationTypes}).forEach(function (incomingRelation) {
                        var referencedModuleName = incomingRelation.href;
                        if (incomingRelation.hrefType === 'moduleRelative') {
                            var parentModuleName = getModuleName(incomingRelation.from);
                            referencedModuleName = Path.join(parentModuleName, '..', referencedModuleName);
                        }
                        if (canonicalModuleName && canonicalModuleName !== referencedModuleName) {
                            if (canonicalModuleName + '.js' === referencedModuleName) {
                                assetGraph.emit('warn', new Error(asset.url + ' is referred to as both ' + canonicalModuleName + ' and ' + referencedModuleName + ', please omit the .js extension in define/require'));
                            } else {
                                assetGraph.emit('info', new Error(asset.url + ' is referred to as both ' + canonicalModuleName + ' and ' + referencedModuleName));
                            }
                        } else {
                            canonicalModuleName = referencedModuleName;
                        }
                    });

                    canonicalModuleNameByUrl[asset.url] = canonicalModuleName || requireJsConfig.getModuleName(asset, fallbackBaseUrl);

                    return canonicalModuleNameByUrl[asset.url];
                }

                assetGraph.eachAssetPostOrder(startRelation, {type: requireJsRelationTypes, to: {type: 'JavaScript'}}, function (asset, incomingRelation) {
                    if (!asset.isLoaded) {
                        return;
                    }
                    var moduleName = getModuleName(asset),
                        isHtmlRequireJsMainWithNoRequires = // Issue #127
                            incomingRelation === startRelation &&
                            startRelation.type === 'HtmlRequireJsMain' &&
                            assetGraph.findRelations({from: asset, type: 'JavaScriptAmdRequire'}).length === 0;

                    var url = asset.url;
                    asset = asset.clone();
                    if (url) {
                        asset.url = url.replace(asset.extension, '-' + asset.id + asset.extension);
                    }
                    assetGraph.findRelations({from: asset}, true).forEach(function (outgoingRelation) {
                        if (requireJsRelationTypes.indexOf(outgoingRelation.type) !== -1) {
                            if (outgoingRelation.to.type === 'JavaScript') {
                                assetGraph.removeRelation(outgoingRelation);
                            } else if ((['Css', 'Less', 'Scss', 'Sass'].indexOf(outgoingRelation.to.type) !== -1) && !/(?:^|\/)text!/.test(outgoingRelation.rawHref)) {
                                var newHtmlStyle = new assetGraph.HtmlStyle({to: outgoingRelation.to});
                                if (htmlStyleInsertionPoint) {
                                    newHtmlStyle.attach(htmlAsset, 'after', htmlStyleInsertionPoint);
                                } else {
                                    newHtmlStyle.attach(htmlAsset, 'first');
                                }
                                htmlStyleInsertionPoint = newHtmlStyle;
                                if (outgoingRelation.type === 'JavaScriptAmdDefine' || outgoingRelation.type === 'JavaScriptAmdRequire') {
                                    outgoingRelation.detach();
                                } else {
                                    assetGraph.removeRelation(outgoingRelation);
                                }
                            } else if (outgoingRelation.to.isText) {
                                var moduleName;
                                if (outgoingRelation.to.url in nonJavaScriptModuleNameByUrl) {
                                    moduleName = nonJavaScriptModuleNameByUrl[outgoingRelation.to.url];
                                } else {
                                    moduleName = nonJavaScriptModuleNameByUrl[outgoingRelation.to.url] = getModuleName(outgoingRelation.to);
                                    var defineStatementValueAst = new uglifyJs.AST_Call({
                                            expression: new uglifyJs.AST_SymbolRef({name: 'GETTEXT'}),
                                            args: [
                                                new uglifyJs.AST_String({value: '<urlGoesHere>'})
                                            ]
                                        }),
                                        callNode = new uglifyJs.AST_Call({
                                            expression: new uglifyJs.AST_SymbolRef({name: 'define'}),
                                            args: [
                                                new uglifyJs.AST_String({value: moduleName}),
                                                defineStatementValueAst
                                            ]
                                        }),
                                        javaScript = new AssetGraph.JavaScript({
                                            outgoingRelations: [],
                                            parseTree: new uglifyJs.AST_Toplevel({
                                                body: [
                                                    new uglifyJs.AST_SimpleStatement({body: callNode})
                                                ]
                                            })
                                        }),
                                        javaScriptGetText = new AssetGraph.JavaScriptGetText({
                                            from: javaScript,
                                            to: outgoingRelation.to,
                                            parentNode: callNode,
                                            node: defineStatementValueAst
                                        });
                                    addHtmlScript(javaScript);
                                    assetGraph.addRelation(javaScriptGetText);
                                    javaScriptGetText.refreshHref();
                                }
                                outgoingRelation.rawHref = moduleName;
                                assetGraph.removeRelation(outgoingRelation);
                            } else {
                                assetGraph.emit('warn', new Error('flattenRequireJs: Skipping unsupported outgoing relation: ' + outgoingRelation.toString()));
                            }
                        }
                    });

                    // Check for existing define() statements:
                    var hasFoundPlausibleDefineStatementValueAst = false,
                        topLevelStatements = asset.parseTree.body,
                        dependencyArrayAst,
                        injectDefineStatementValueAst,
                        injectDefineStatementAfter = false;

                    // Detect the most common variants of the UMD pattern by looking for a single define call
                    // inside the body of an iife that contains a single if statement:
                    if (topLevelStatements.length === 1 &&
                        topLevelStatements[0] instanceof uglifyJs.AST_SimpleStatement &&
                        topLevelStatements[0].body instanceof uglifyJs.AST_Call &&
                        topLevelStatements[0].body.expression instanceof uglifyJs.AST_Function &&
                        topLevelStatements[0].body.expression.body.length === 1 &&
                        topLevelStatements[0].body.expression.body[0] instanceof uglifyJs.AST_If) {

                        var umdWrapperArgs = topLevelStatements[0].body.expression.argnames,
                            defineCalls = [];

                        topLevelStatements[0].body.expression.walk(new uglifyJs.TreeWalker(function (node) {
                            if (node instanceof uglifyJs.AST_Call && node.expression instanceof uglifyJs.AST_SymbolRef && node.expression.name === 'define') {
                                defineCalls.push(node);
                            }
                        }));
                        if (defineCalls.length === 1) {
                            var defineArgs = defineCalls[0].args,
                                lastArg = defineArgs[defineArgs.length - 1];
                            if (lastArg instanceof uglifyJs.AST_SymbolRef) {
                                // See if the last argument to define is present in the argument list for the iife.
                                // If so, assume we found an UMD stub that can be replaced with the corresponding iife argument:
                                // (function () {... define(['foo'], factory);}(root, factory)) => define(['foo'], factory)
                                umdWrapperArgs.some(function (umdWrapperArg, i) {
                                    if (umdWrapperArg.name === lastArg.name) {
                                        injectDefineStatementValueAst = topLevelStatements[0].body.args[i];
                                        if (defineArgs.length > 1 && defineArgs[defineArgs.length - 2] instanceof uglifyJs.AST_Array) {
                                            dependencyArrayAst = defineArgs[defineArgs.length - 2];
                                        }
                                        topLevelStatements = asset.parseTree.body = [];
                                        hasFoundPlausibleDefineStatementValueAst = true;
                                        return false;
                                    }
                                });
                            }
                        }
                    }
                    // If that didn't work, look for define statements in the entire module so that we can inject the correct
                    // module name as the first argument:
                    if (!hasFoundPlausibleDefineStatementValueAst) {
                        var callDefineAsts = [];
                        asset.parseTree.walk(new uglifyJs.TreeWalker(function (node) {
                            if (node instanceof uglifyJs.AST_Call &&
                                node.expression instanceof uglifyJs.AST_SymbolRef && node.expression.name === 'define') {
                                callDefineAsts.push(node);
                            }
                        }));
                        if (callDefineAsts.length === 1) {
                            if (moduleName) {
                                var firstArgumentIsString = callDefineAsts[0].args.length > 0 && callDefineAsts[0].args[0] instanceof uglifyJs.AST_String;
                                // Inject the module name (as derived from the module's url) into the define call.
                                // If there's already a module name as the first argument, overwrite it assuming that we know better.
                                // (many modules use the 3-argument define for no good reason):
                                callDefineAsts[0].args.splice(0, firstArgumentIsString ? 1 : 0, new uglifyJs.AST_String({value: moduleName}));
                            }
                            injectDefineStatementValueAst = null;
                            hasFoundPlausibleDefineStatementValueAst = true;
                        }
                    }
                    if (!hasFoundPlausibleDefineStatementValueAst) {
                        // That didn't work either, check if we're supposed to shim the module:
                        if (requireJsConfig.shim[moduleName] && requireJsConfig.shim[moduleName].exports) {
                            injectDefineStatementValueAst = new uglifyJs.AST_Function({
                                name: null,
                                argnames: [],
                                body: [
                                    new uglifyJs.AST_Return({value: uglifyAst.parseExpression(requireJsConfig.shim[moduleName].exports)})
                                ]
                            });
                        } else if (moduleName) {
                            // Probably the main module:
                            injectDefineStatementValueAst = new uglifyJs.AST_Function({name: null, argnames: [], body: []});
                        }
                    }
                    var defineStatementAst;
                    if (injectDefineStatementValueAst) {
                        var defineArgsAst = [new uglifyJs.AST_String({value: moduleName})];
                        if (dependencyArrayAst) {
                            defineArgsAst.push(dependencyArrayAst);
                        }
                        defineArgsAst.push(injectDefineStatementValueAst);
                        defineStatementAst = new uglifyJs.AST_SimpleStatement({
                            body: new uglifyJs.AST_Call({
                                expression: new uglifyJs.AST_SymbolRef({name: 'define'}),
                                args: defineArgsAst
                            })
                        });
                        injectDefineStatementAfter = true;
                    }
                    if (defineStatementAst) {
                        if (injectDefineStatementAfter) {
                            asset.parseTree.body.push(defineStatementAst);
                        } else {
                            asset.parseTree.body = [new uglifyJs.AST_Toplevel({body: [defineStatementAst]})];
                        }
                    }
                    // This file is referenced by requirejs via a data-main attribute, but is only calling define.
                    // Default requirejs behavior is to require the defined module.
                    if (isHtmlRequireJsMainWithNoRequires) {
                        asset.parseTree.body.push(new uglifyJs.AST_SimpleStatement({
                            body: new uglifyJs.AST_Call({
                                expression: new uglifyJs.AST_SymbolRef({name: 'require'}),
                                args: [
                                    new uglifyJs.AST_Array({
                                        elements: [
                                            new uglifyJs.AST_String({value: moduleName})
                                        ]
                                    })
                                ]
                            })
                        }));
                    }
                    asset.markDirty();
                    addHtmlScript(asset);
                });
                startRelation.detach();
            });
        });
        assetGraph.recomputeBaseAssets(true);
    };
};

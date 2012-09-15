var _ = require('underscore'),
    urlTools = require('../util/urlTools'),
    vm = require('vm'),
    uglifyJs = require('uglify-js-papandreou'),
    uglifyAst = require('uglifyast');

module.exports = function (queryObj) {
    return function bundleRequireJs(assetGraph) {
        var requireJsConfig = assetGraph.requireJsConfig || {paths: {}},
            assetsToCleanUp = [];
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

                var baseUrl = (requireJsConfig.baseUrl && requireJsConfig.baseUrl.replace(/\/$/, '')) || (startRelation.to.url || htmlAsset.url).replace(/[^\/]+$/, ''),
                    modulePrefixByPath = {},
                    modulePaths = [];

                Object.keys(requireJsConfig.paths).forEach(function (modulePrefix) {
                    var modulePath = requireJsConfig.paths[modulePrefix].replace(baseUrl, "").replace(/\/$/, '');
                    modulePrefixByPath[modulePath] = modulePrefix;
                    modulePaths.push(modulePath);
                });
                var modulePathsOrderedByLengthDesc = modulePaths.sort(function (a, b) {
                    return b.length - a.length;
                });

                function getModuleName(asset) {
                    if (asset.isInline) {
                        return null;
                    }
                    var moduleName = urlTools.buildRelativeUrl(baseUrl, asset.url).replace(/\.js$/, "");
                    for (var i = 0 ; i < modulePathsOrderedByLengthDesc.length ; i += 1) {
                        var path = modulePathsOrderedByLengthDesc[i];
                        if (moduleName.indexOf(path + "/") === 0) {
                            moduleName = moduleName.replace(path, modulePrefixByPath[path]);
                            break;
                        }
                    }
                    return moduleName;
                }

                var outgoingRelations = [],
                    assetsToBundle = [],
                    bundleTopLevelStatements = [];

                assetGraph.eachAssetPostOrder(startRelation, {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine'], to: {type: 'JavaScript'}}, function (asset) {
                    var clonedAsset = asset.clone();
                    assetsToCleanUp.push(asset);
                    assetsToBundle.push(clonedAsset);
                    assetGraph.findRelations({from: clonedAsset}, true).forEach(function (outgoingRelation) {
                        var injectDefineStatementValueAst;
                        if (/^JavaScriptAmd(?:Define|Require)$/.test(outgoingRelation.type)) {
                            if (outgoingRelation.to.type === 'JavaScript') {
                                assetGraph.removeRelation(outgoingRelation);
                            } else if (outgoingRelation.to.type === 'Css' || outgoingRelation.to.type === 'Less') {
                                var newHtmlStyle = new assetGraph.constructor.relations.HtmlStyle({to: outgoingRelation.to});
                                if (htmlStyleInsertionPoint) {
                                    newHtmlStyle.attach(htmlAsset, 'after', htmlStyleInsertionPoint);
                                } else {
                                    newHtmlStyle.attach(htmlAsset, 'first');
                                }
                                htmlStyleInsertionPoint = newHtmlStyle;
                                outgoingRelation.detach();
                            } else if (outgoingRelation.to.isText) {
                                injectDefineStatementValueAst = ['call', ['name', 'GETTEXT'], [['string', '<urlGoesHere>']]];
                                var oneGetTextRelation = new assetGraph.constructor.relations.JavaScriptGetText({
                                    node: injectDefineStatementValueAst,
                                    from: clonedAsset,
                                    to: outgoingRelation.to
                                });
                                outgoingRelations.push(oneGetTextRelation);

                                if (outgoingRelation.to.type === 'KnockoutJsTemplate') {
                                    injectDefineStatementValueAst = ['assign', true, ['sub', ['dot', ['dot', ['name', 'ko'], 'externalTemplateEngine'], 'templates'], ['string', getModuleName(outgoingRelation.to).replace(/^.*\/|\.ko/g, '')]], injectDefineStatementValueAst];
                                    outgoingRelation.node[1] = outgoingRelation.node[1].replace(/^tpl!/, '');
                                } else {
                                    outgoingRelation.node[1] = outgoingRelation.node[1].replace(/^text!/, "");
                                }
                            } else {
                                assetGraph.emit('warn', new Error("bundleRequireJs: Skipping unsupported outgoing relation: " + outgoingRelation.toString()));
                            }
                            if (injectDefineStatementValueAst) {
                                bundleTopLevelStatements.push(['stat', ['call', ['name', 'define'], [['string', getModuleName(outgoingRelation.to)], injectDefineStatementValueAst]]]);
                            }
                        } else {
                            outgoingRelations.push(outgoingRelation);
                        }
                    });

                    // Check for existing define() statements:
                    var hasFoundPlausibleDefineStatementValueAst = false,
                        topLevelStatements = clonedAsset.parseTree[1],
                        injectDefineStatementValueAst;

                    if (topLevelStatements.length === 1 && topLevelStatements[0][0] === 'stat' &&
                        topLevelStatements[0][1][0] === 'call' &&
                        topLevelStatements[0][1][1][0] === 'function' &&
                        topLevelStatements[0][1][1][3].length === 1 &&
                        topLevelStatements[0][1][1][3][0][0] === 'if') {

                        var numDefineStatements = 0,
                            walker = uglifyJs.uglify.ast_walker();
                        walker.with_walkers({
                            call: function (expr, args) {
                                if (expr[0] === 'name' && expr[1] === 'define') {
                                    numDefineStatements += 1;
                                }
                            }
                        }, function () {
                            walker.walk(topLevelStatements[0][1][1]);
                        });
                        if (numDefineStatements === 1) {
                            var context = vm.createContext(),
                                factory;
                            context.define = function () {
                                if (arguments.length > 0 && typeof arguments[arguments.length - 1] === 'function') {
                                    factory = arguments[arguments.length - 1];
                                }
                            };
                            context.define.amd = {jQuery: true, multiversion: true, plugins: true};

                            try {
                                vm.runInContext(uglifyJs.uglify.gen_code(topLevelStatements[0]), context);
                            } catch (e) {
                                factory = false;
                            }
                            if (factory) {
                                injectDefineStatementValueAst = uglifyAst.objToAst(factory);
                                topLevelStatements = clonedAsset.parseTree[1] = [];
                                hasFoundPlausibleDefineStatementValueAst = true;
                            }
                        }
                    }
                    if (!hasFoundPlausibleDefineStatementValueAst) {
                        var callDefineAsts = [],
                            walker = uglifyJs.uglify.ast_walker();
                        walker.with_walkers({
                            call: function (expr) {
                                if (expr[0] === 'name' && expr[1] === 'define') {
                                    var stack = walker.stack();
                                    callDefineAsts.push(stack[stack.length - 1]);
                                }
                            }
                        }, function () {
                            walker.walk(clonedAsset.parseTree);
                        });
                        if (callDefineAsts.length === 1) {
                            var moduleName = getModuleName(asset, htmlAsset);
                            if (moduleName) {
                                if (asset === startRelation.to) {
                                    // Strip "scripts/" prefix of the main module (hmm, not sure?)
                                    moduleName = moduleName.replace(/^.*\//, "");
                                }
                                var firstArgumentIsString = callDefineAsts[0][2].length > 0 && callDefineAsts[0][2][0][0] === 'string';
                                callDefineAsts[0][2].splice(0, firstArgumentIsString ? 1 : 0, ['string', moduleName]);
                            }
                            injectDefineStatementValueAst = null;
                            hasFoundPlausibleDefineStatementValueAst = true;
                        }
                    }
                    if (injectDefineStatementValueAst) {
                        bundleTopLevelStatements.push(['stat', ['call', ['name', 'define'], [['string', getModuleName(asset)], injectDefineStatementValueAst]]]);
                    }
                    Array.prototype.push.apply(bundleTopLevelStatements, clonedAsset.parseTree[1]);
                });
                startRelation.to.replaceWith(new assetGraph.constructor.assets.JavaScript({
                    url: startRelation.to.url,
                    parseTree: ['toplevel', bundleTopLevelStatements],
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

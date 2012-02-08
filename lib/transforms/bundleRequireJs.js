var _ = require('underscore'),
    urlTools = require('../util/urlTools');

module.exports = function (queryObj) {
    return function bundleRequireJs(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlRequireJsMain'}).forEach(function (htmlRequireJsMain) {
                var outgoingRelations = [],
                    assetsToBundle = [],
                    bundleTopLevelStatements = [];

                assetGraph.eachAssetPostOrder(htmlRequireJsMain, {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine']}, function (asset, incomingRelation) {
                    if (asset.incomingRelations.length > 1) {
                        asset = asset.clone([incomingRelation]);
                    }
                    assetsToBundle.push(asset);
                    assetGraph.findRelations({from: asset, type: assetGraph.constructor.query.not(['JavaScriptAmdRequire', 'JavaScriptAmdDefine'])}).forEach(function (outgoingRelation) {
                        outgoingRelations.push(outgoingRelation);
                        assetGraph.removeRelation(outgoingRelation);
                    });
                    var moduleName = urlTools.buildRelativeUrl(incomingRelation.baseAsset.url, asset.url).replace(/\//g, '-').replace(/\.js$/, "");
                    if (asset === htmlRequireJsMain.to) {
                        // Strip "scripts-" prefix of the main module (hmm, not sure?)
                        moduleName = moduleName.replace(/^.*-/, "");
                    }
                    var injectDefineStatementValueAst;
                    if (asset.type === 'JavaScript') {
                        Array.prototype.push.apply(bundleTopLevelStatements, asset.parseTree[1]);

                        // FIXME: The only reason to not add a define() for empty modules is to make sure that the bogus 'jquery.js'
                        // in the jquery-require-sample test doesn't add one so the test passes.
                        if (asset.parseTree[1].length) {
                            injectDefineStatementValueAst = ['function', null, [], []];
                        }

                        // Check for existing define() statements:
                        var topLevelStatements = asset.parseTree[1];
                        for (var i = 0 ; i < topLevelStatements.length ; i += 1) {
                            var topLevelStatement = topLevelStatements[i];
                            if (topLevelStatement[0] === 'stat' && topLevelStatement[1][0] === 'call' && topLevelStatement[1][1][0] === 'name' &&
                                topLevelStatement[1][1][1] === 'define' && topLevelStatement[1][2].length > 0) {

                                if (topLevelStatement[1][2][0] === 'string' &&
                                    topLevelStatement[1][2][1] === moduleName) {

                                    injectDefineStatementValueAst = null;
                                    break;

                                } else if (topLevelStatement[1][2][0][0] === 'array' || topLevelStatement[1][2][0][0] === 'function') {
                                    topLevelStatement[1][2].unshift(['string', moduleName]);
                                    injectDefineStatementValueAst = null;
                                    break;
                                }
                            }
                        }
                    } else if (asset.isText) {
                        injectDefineStatementValueAst = ['string', asset.text];
                        assetGraph.findRelations({to: asset, type: ['JavaScriptAmdDefine', 'JavaScriptAmdRequire']}).forEach(function (otherIncomingRelation) {
                            if (/^text!/.test(otherIncomingRelation.node[1])) {
                                otherIncomingRelation.node[1] = otherIncomingRelation.node[1].replace(/^text!/, "");
                                otherIncomingRelation.from.markDirty();
                            }
                        });
                    }
                    if (injectDefineStatementValueAst) {
                        bundleTopLevelStatements.push(['stat', ['call', ['name', 'define'], [['string', moduleName], injectDefineStatementValueAst]]]);
                    }
                });
                var original = htmlRequireJsMain.to;
                assetsToBundle.forEach(function (asset) {
                    if (asset !== original && asset.incomingRelations.length <= 1) {
                        assetGraph.removeAsset(asset);
                    }
                });
                original.replaceWith(new assetGraph.constructor.assets.JavaScript({
                    url: htmlRequireJsMain.to.url,
                    parseTree: ['toplevel', bundleTopLevelStatements],
                    outgoingRelations: outgoingRelations
                }));
            });
        });
    };
};

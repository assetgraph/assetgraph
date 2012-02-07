var _ = require('underscore');

module.exports = function (queryObj) {
    return function bundleRequireJs(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlRequireJsMain'}).forEach(function (htmlRequireJsMain) {
                var outgoingRelations = [],
                    topLevelStatements = [];

                assetGraph.eachAssetPostOrder(htmlRequireJsMain, {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine']}, function (asset, incomingRelation) {
                    if (asset.incomingRelations.length > 1) {
                        asset = asset.clone([incomingRelation]);
                    }
                    Array.prototype.push.apply(outgoingRelations, assetGraph.findRelations({from: asset, type: assetGraph.constructor.query.not(['JavaScriptAmdRequire', 'JavaScriptAmdDefine'])}));

                    var moduleName = incomingRelation.href.replace(/\.js$/, '');
                    if (asset === htmlRequireJsMain.to) {
                        // Strip "scripts/" prefix (hrm?)
                        moduleName = moduleName.replace(/^scripts\//, "");
                    }
                    var valueAst;
                    if (asset.type === 'JavaScript') {
                        Array.prototype.push.apply(topLevelStatements, asset.parseTree[1]);
                        if (asset.parseTree[1].length) {
                            valueAst = ['function', null, [], []];
                        }
                    } else if (asset.isText) {
                        valueAst = ['string', asset.text];
                        assetGraph.findRelations({to: asset, type: ['JavaScriptAmdDefine', 'JavaScriptAmdRequire']}).forEach(function (otherIncomingRelation) {
                            if (/^text!/.test(otherIncomingRelation.node[1])) {
                                otherIncomingRelation.node[1] = otherIncomingRelation.node[1].replace(/^text!/, "");
                                otherIncomingRelation.from.markDirty();
                            }
                        });
                    }
                    if (valueAst) {
                        topLevelStatements.push([
                            'stat',
                            [
                                'call',
                                [
                                    'name',
                                    'define'
                                ],
                                [
                                    [
                                        'string',
                                        moduleName
                                    ],
                                    valueAst
                                ]
                            ]
                        ]);
                    }
                    if (asset !== htmlRequireJsMain.to) {
                        assetGraph.removeAsset(asset);
                    }
                });
                htmlRequireJsMain.to.replaceWith(new assetGraph.constructor.assets.JavaScript({
                    parseTree: ['toplevel', topLevelStatements],
                    outgoingRelations: outgoingRelations
                }));
            });
        });
    };
};

var _ = require('underscore');

module.exports = function (queryObj) {
    return function bundleRequireJs(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({from: htmlAsset, type: 'HtmlRequireJsMain'}).forEach(function (htmlRequireJsMain) {
                var outgoingRelations = [],
                    topLevelStatements = [];

                assetGraph.eachAssetPostOrder(htmlRequireJsMain, {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine']}, function (javaScript, incomingRelation) {
                    if (javaScript.incomingRelations.length > 1) {
                        javaScript = javaScript.clone([incomingRelations]);
                    }
                    Array.prototype.push.apply(outgoingRelations, assetGraph.findRelations({from: javaScript, type: assetGraph.constructor.query.not(['JavaScriptAmdRequire', 'JavaScriptAmdDefine'])}));
                    Array.prototype.push.apply(topLevelStatements, javaScript.parseTree[1]);
                    if (javaScript.parseTree[1].length) {
                        var moduleName = incomingRelation.href.replace(/\.js$/, '');
                        if (javaScript === htmlRequireJsMain.to) {
                            // Strip "scripts/" prefix (hrm?)
                            moduleName = moduleName.replace(/^scripts\//, "");
                        }
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
                                    [
                                        'function',
                                        null,
                                        [],
                                        []
                                    ]
                                ]
                            ]
                        ]);
                    }
                    if (javaScript !== htmlRequireJsMain.to) {
                        assetGraph.removeAsset(javaScript);
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

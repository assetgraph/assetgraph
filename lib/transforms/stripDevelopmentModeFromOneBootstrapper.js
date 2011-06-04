var _ = require('underscore'),
    seq = require('seq');

module.exports = function (queryObj) {
    return function stripDevelopmentModeFromOneBootstrapper(assetGraph, cb) {
        var bootstrappersById = {};
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlScript', from: htmlAsset, node: {id: 'oneBootstrapper'}}).forEach(function (htmlScript) {
                bootstrappersById[htmlScript.to.id] = htmlScript.to;
            });
        })
        seq(_.values(bootstrappersById))
            .parEach(function (javaScript) {
                javaScript.getParseTree(this);
            })
            .parEach(function (javaScript) {
                var topLevelStatements = javaScript.parseTree[1];
                for (var i = 0 ; i < topLevelStatements.length ; i += 1) {
                    var statement = topLevelStatements[i];
                    if (statement[0] === 'stat' && statement[1][0] === 'call' && statement[1][1][0] === 'function' && statement[1][1][1] === 'installOneDevelopmentMode') {
                        topLevelStatements.splice(i, 1);
                        assetGraph.markAssetDirty(javaScript);
                    }
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

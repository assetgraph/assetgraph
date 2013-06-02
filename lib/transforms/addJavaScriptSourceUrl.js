var _ = require('underscore'),
    AssetGraph = require('../AssetGraph');

module.exports = function (queryObj) {
    return function (assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            new AssetGraph.JavaScriptSourceUrl({
                from: javaScript,
                to: javaScript
            }).attach(javaScript, 'last');
        });
    };
};

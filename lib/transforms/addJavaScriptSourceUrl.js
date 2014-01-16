var _ = require('underscore'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function addJavaScriptSourceUrl(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            new AssetGraph.JavaScriptSourceUrl({
                to: javaScript,
                hrefType: 'rootRelative'
            }).attach(javaScript, 'last');
        });
    };
};

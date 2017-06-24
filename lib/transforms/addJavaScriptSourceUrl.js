const _ = require('lodash');
const AssetGraph = require('../AssetGraph');

module.exports = queryObj => {
    return function addJavaScriptSourceUrl(assetGraph) {
        for (const javaScript of assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj))) {
            new AssetGraph.JavaScriptSourceUrl({
                to: javaScript,
                hrefType: 'rootRelative'
            }).attach(javaScript, 'last');
        }
    };
};

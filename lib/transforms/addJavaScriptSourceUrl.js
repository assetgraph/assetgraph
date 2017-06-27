const AssetGraph = require('../AssetGraph');

module.exports = queryObj => {
    return function addJavaScriptSourceUrl(assetGraph) {
        for (const javaScript of assetGraph.findAssets(Object.assign({type: 'JavaScript'}, queryObj))) {
            new AssetGraph.JavaScriptSourceUrl({
                to: javaScript,
                hrefType: 'rootRelative'
            }).attach(javaScript, 'last');
        }
    };
};

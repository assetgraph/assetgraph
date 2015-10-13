module.exports = function () {
    return function assumeRequireJsConfigHasBeenFound(assetGraph) {
        // Assume that if there is a require.js config, it was in one of the top-level scripts:
        // This is only possible if the preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound option
        // for the registerRequireJsConfig transform is active.
        if (assetGraph.requireJsConfig) {
            assetGraph.findAssets({type: 'JavaScript', keepUnpopulated: true}).forEach(function (javaScriptAsset) {
                javaScriptAsset.keepUnpopulated = false;
                javaScriptAsset.populate();
            });
            assetGraph.requireJsConfig.assumeRequireJsConfigHasBeenFound = true;
            assetGraph.requireJsConfig.preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound = false;
        }
    };
};

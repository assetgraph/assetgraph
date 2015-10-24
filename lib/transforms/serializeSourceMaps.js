var AssetGraph = require('../');

module.exports = function () {
    return function serializeSourceMaps(assetGraph) {
        assetGraph.findAssets({ type: 'JavaScript' }).forEach(function (javaScript) {
            if (javaScript.isDirty || !javaScript.isInitial) { // <-- isInitial should actually be whether the asset corresponds 1-to-1 to the original 
                var existingSourceMapRelations = assetGraph.findRelations({ from: javaScript, type: 'JavaScriptSourceMappingUrl' });
                var sourceMap;
                if (existingSourceMapRelations.length > 0) {
                    sourceMap = existingSourceMapRelations[0].to;
                } else {
                    sourceMap = new AssetGraph.SourceMap({ url: javaScript.isInline ? null : javaScript.url + '.map' });
                    assetGraph.addAsset(sourceMap);
                    new AssetGraph.JavaScriptSourceMappingUrl({
                        to: sourceMap
                    }).attach(javaScript, 'last');
                }

                javaScript.serializationOptions = javaScript.serializationOptions || {};
                var oldSourceMapSetting = javaScript.serializationOptions.sourceMap;
                javaScript.serializationOptions.sourceMap = true;

                if (javaScript._text) {
                    delete javaScript._text;
                }
                /*jshint -W030 */
                javaScript.text;
                /*jshint +W030 */
                javaScript.serializationOptions.sourceMap = oldSourceMapSetting;
                sourceMap.parseTree = javaScript.sourceMap.toJSON();
            }
        });
    };
};

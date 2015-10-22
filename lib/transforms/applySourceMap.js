var sourceMapToAst = require('sourcemap-to-ast');

module.exports = function () {
    return function (assetGraph) {
        assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
            var sourceMappingUrl = assetGraph.findRelations({ from: javaScript, type: 'JavaScriptSourceMappingUrl', to: { isLoaded: true } })[0];
            if (sourceMappingUrl) {
                if (javaScript.parseTree) {
                    sourceMapToAst(javaScript.parseTree, sourceMappingUrl.to.text);
                }
            }
        });
    };
};

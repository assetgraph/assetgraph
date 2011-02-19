var jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    Script = process.binding('evals').Script;

exports.executeJavaScript = function (options) {
    if (!options.environment) {
        throw new Error("transforms.executeJavaScript: no 'environment' option provided");
    }
    return function executeJavaScript(assetGraph, cb) {
        assetGraph.findAssets({isInitial: true}).forEach(function (initialAsset) {
            assetGraph.createSubgraph(initialAsset, {
                type: ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptIfEnvironment'],
                environment: options.environment
            }).findRelations({type: 'JavaScriptIfEnvironment'}).forEach(function (relation) {
                var window = jsdom.createWindow();
                // Mark the HTML asset as dirty if window.document is touched during the execution:
                window.__defineGetter__('document', function () {
                    assetGraph.markAssetDirty(htmlAsset);
                    return htmlAsset.parseTree;
                });
                Script.runInNewContext(uglify.uglify.gen_code(relation.to.parseTree), window);
            });
        });

        process.nextTick(cb);
    };
};

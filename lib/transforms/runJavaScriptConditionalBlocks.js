var jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    Script = process.binding('evals').Script;

exports.runJavaScriptConditionalBlocks = function (queryObj, environment) {
    if (!environment) {
        throw new Error("transforms.runJavaScriptConditionalBlocks: no 'environment' option provided");
    }
    return function runJavaScriptConditionalBlocks(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
            assetGraph.createSubgraph(initialAsset, {
                type: ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptConditionalBlock']
            }).findRelations({
                type: 'JavaScriptConditionalBlock',
                environment: environment
            }).forEach(function (relation) {
                var window = jsdom.createWindow();
                // Mark the HTML asset as dirty just in case, the conditional block might manipulate it:
                assetGraph.markAssetDirty(initialAsset);
                window.document = initialAsset.parseTree;
                // FIXME: Would it be more correct to assetGraph.serializeAsset instead?
                Script.runInNewContext(uglify.uglify.gen_code(relation.to.parseTree), window);
            });
        });

        process.nextTick(cb);
    };
};

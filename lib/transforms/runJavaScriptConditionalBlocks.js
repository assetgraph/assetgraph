var step = require('step'),
    jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    Script = process.binding('evals').Script,
    error = require('../error');

exports.runJavaScriptConditionalBlocks = function (queryObj, environment) {
    if (!environment) {
        throw new Error("transforms.runJavaScriptConditionalBlocks: no 'environment' option provided");
    }
    return function runJavaScriptConditionalBlocks(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        step(
            function () {
                var group = this.group();
                assetGraph.findAssets(queryObj).forEach(function (initialAsset) {
                    assetGraph.createSubgraph(initialAsset, {
                        type: ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptConditionalBlock']
                    }).findRelations({
                        type: 'JavaScriptConditionalBlock',
                        environment: environment
                    }).forEach(function (relation) {
                        var callback = group(),
                            window = jsdom.createWindow();
                        // Mark the HTML asset as dirty just in case, the conditional block might manipulate it:
                        assetGraph.markAssetDirty(initialAsset);
                        window.document = initialAsset.parseTree;
                        assetGraph.getAssetText(relation.to, error.passToFunction(callback, function (src) {
                            Script.runInNewContext(src, window);
                            callback();
                        }));
                    });
                });
                process.nextTick(group());
            },
            cb
        );
    };
};

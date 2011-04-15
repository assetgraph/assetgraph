var seq = require('seq'),
    jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    Script = process.binding('evals').Script,
    error = require('../error');

module.exports = function (queryObj, environment) {
    if (!environment) {
        throw new Error("transforms.runJavaScriptConditionalBlocks: no 'environment' option provided");
    }
    return function runJavaScriptConditionalBlocks(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq()
            .extend(assetGraph.findAssets(queryObj))
            .parEach(function (initialAsset) {
                var callback = this;
                seq()
                    .extend(
                        assetGraph.createSubgraph(initialAsset, {
                            type: ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptConditionalBlock']
                        }).findRelations({
                            type: 'JavaScriptConditionalBlock',
                            environment: environment
                        })
                    )
                    .parMap(function (relation) {
                        assetGraph.getAssetText(relation.to, this);
                    })
                    .parEach(function (text) {
                        var window = jsdom.createWindow();
                        // Mark the HTML asset as dirty just in case, the conditional block might manipulate it:
                        assetGraph.markAssetDirty(initialAsset);
                        window.document = initialAsset.parseTree;
                        Script.runInNewContext(text, window);
                        this();
                    })
                    .seq(function () {
                        callback();
                    })
                    ['catch'](callback);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

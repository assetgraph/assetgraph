var vm = require('vm'),
    _ = require('underscore'),
    seq = require('seq'),
    jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    traversal = require('../traversal'),
    i18nTools = require('../i18nTools'),
    error = require('../error');

module.exports = function (queryObj, environment) {
    if (!environment) {
        throw new Error("transforms.runJavaScriptConditionalBlocks: no 'environment' option provided");
    }
    return function runJavaScriptConditionalBlocks(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(_.extend({type: 'HTML'}, queryObj)))
            .parEach(function (htmlAsset) {
                var callback = this;
                seq()
                    .seq(function () {
                        i18nTools.getBootstrappedContext(assetGraph, htmlAsset, this.into('context'));
                    })
                    .set(
                        traversal.collectAssetsPostOrder(assetGraph, htmlAsset, {type: ['HTMLScript', 'JavaScriptStaticInclude']}).filter(function (asset) {
                            return asset.type === 'JavaScript';
                        })
                    )
                    .flatten() // https://github.com/substack/node-seq/pull/9
                    .parEach(function (javaScript) {
                        javaScript.getParseTree(this);
                    })
                    .parEach(function (javaScript) {
                        // Loop through top-level statements:
                        var topLevelStatements = javaScript.parseTree[1],
                            context = this.vars.context;
                        for (var i = 0 ; i < topLevelStatements.length ; i += 1) {
                            var node = topLevelStatements[i];
                            if (node[0] === 'if' && node[1][0] === 'dot' && node[1][1][0] === 'name' &&
                                node[1][1][1] === 'one' && environment === node[1][2]) {

                                // Mark the HTML asset as dirty just in case, the conditional block might manipulate it:
                                assetGraph.markAssetDirty(htmlAsset);
                                var fileName = javaScript.url || assetGraph.getBaseAssetForRelation(assetGraph.findRelations({to: javaScript})[0]).url;
                                try {
                                    new vm.Script(uglify.uglify.gen_code(node[2]), fileName).runInContext(context);
                                } catch (e) {
                                    return this(e);
                                }
                            }
                        }
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

var vm = require('vm'),
    _ = require('underscore'),
    seq = require('seq'),
    jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    i18nTools = require('../util/i18nTools'),
    passError = require('../util/passError');

module.exports = function (queryObj, environment, removeAfter) {
    if (!environment) {
        throw new Error("transforms.runJavaScriptConditionalBlocks: no 'environment' option provided");
    }
    return function runJavaScriptConditionalBlocks(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)))
            .parEach(function (htmlAsset) {
                var callback = this;
                seq()
                    .seq(function () {
                        i18nTools.getBootstrappedContext(assetGraph, htmlAsset, this.into('context'));
                    })
                    .set(
                        assetGraph.collectAssetsPostOrder(htmlAsset, {type: ['HtmlScript', 'JavaScriptOneInclude']}).filter(function (asset) {
                            return asset.type === 'JavaScript';
                        })
                    )
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

                                var fileName = javaScript.url || assetGraph.getBaseAssetForRelation(assetGraph.findRelations({to: javaScript})[0]).url;
                                try {
                                    new vm.Script(uglify.uglify.gen_code(node[2]), fileName).runInContext(context);
                                } catch (e) {
                                    return this(e);
                                }
                                if (removeAfter) {
                                    javaScript.parseTree[1].splice(i, 1);
                                    i -= 1;
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

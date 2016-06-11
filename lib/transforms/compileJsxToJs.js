/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

var _ = require('lodash'),
    async = require('async'),
    passError = require('passerror'),
    AssetGraph = require('../');

module.exports = function (queryObj, options) {
    options = options || {};
    return function compileJsxToJs(assetGraph, cb) {
        var reactTools,
            jsxAssets = assetGraph.findAssets(_.extend({type: 'Jsx', isLoaded: true}, queryObj));
        if (jsxAssets.length > 0) {
            try {
                reactTools = require('react-tools');
            } catch (e) {
                assetGraph.emit('warn', new Error('compileJsxToJs: Found ' + jsxAssets.length + ' jsx asset(s), but no jsx transformer is available. Please install react-tools in your project so compileJsxToJs can require it.'));
                return setImmediate(cb);
            }
        }
        (function compileAllJsxAssets() {
            var compiledAssets = [];
            async.each(jsxAssets, function (jsxAsset, cb) {
                try {
                    var text,
                        sourceMap;
                    if (reactTools.transformWithDetails) {
                        var result = reactTools.transformWithDetails(jsxAsset.text, { sourceMap: options.sourceMaps });
                        text = result.code;
                        if (options.sourceMaps) {
                            sourceMap = result.sourceMap;
                            var nonInlineAncestor = jsxAsset.nonInlineAncestor;
                            if (nonInlineAncestor) {
                                sourceMap.sources = [ nonInlineAncestor.url ];
                            }
                            if (options.sourcesContent) {
                                sourceMap.sourcesContent = [ jsxAsset.text ];
                            }
                        }
                    } else {
                        text = reactTools.transform(jsxAsset.text);
                    }
                    var jsAsset = new AssetGraph.JavaScript({
                        text: text,
                        sourceMap: sourceMap,
                        url: jsxAsset.url.replace(/\.jsx$/, '.js')
                    });

                    jsxAsset.replaceWith(jsAsset);
                    compiledAssets.push(jsAsset);
                    cb();
                } catch (e) {
                    cb(new Error('jsx compiler threw an exception: ' + require('util').inspect(e)));
                }
            }, passError(cb, function () {
                if (assetGraph.followRelations) {
                    assetGraph
                        .populate()
                        .run(passError(cb, function () {
                            if (assetGraph.findAssets({type: 'Jsx', isLoaded: true}).length > 0) {
                                jsxAssets = assetGraph.findAssets(_.extend({type: 'Jsx', isLoaded: true}, queryObj));
                                compileAllJsxAssets();
                            } else {
                                cb();
                            }
                        }));
                } else {
                    cb();
                }
            }));
        }());
    };
};

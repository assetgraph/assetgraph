/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

var _ = require('lodash'),
    async = require('async'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function compileJsxToJs(assetGraph, cb) {
        var jsxtransform,
            jsxAssets = assetGraph.findAssets(_.extend({type: 'Jsx'}, queryObj));
        if (jsxAssets.length > 0) {
            try {
                jsxtransform = require('react-tools').transform;
            } catch (e) {
                assetGraph.emit('warn', new Error('compileJsxToJs: Found ' + jsxAssets.length + ' jsx asset(s), but no jsx transformer is available. Please install react-tools in your project so compileJsxToJs can require it.'));
                return setImmediate(cb);
            }
        }
        async.each(jsxAssets, function (jsxAsset, cb) {
            var jsxOptions = {};
            var jsText;
            var jsAsset;
            try {
                jsText = jsxtransform(jsxAsset.text, jsxOptions);
                jsAsset = new AssetGraph.JavaScript({
                    text: jsText,
                    url: jsxAsset.url.replace(/\.jsx$/, '.js')
                });

                jsxAsset.replaceWith(jsAsset);
                jsAsset.incomingRelations.forEach(function (incomingRelation) {
                });
                cb();
            } catch (e) {
                cb(new Error('jsx compiler threw an exception: ' + require('util').inspect(e)));
            }
        }, cb);
    };
};

var path = require('path'),
    _ = require('underscore'),
    async = require('async'),
    urlTools = require('urltools'),
    passError = require('passerror'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function compileStylusToCss(assetGraph, cb) {
        var stylusAssets = assetGraph.findAssets(_.extend({type: 'Stylus'}, queryObj)),
            stylus;
        if (stylusAssets.length > 0) {
            try {
                stylus = require('stylus');
            } catch (e) {
                assetGraph.emit('warn', new Error('compileStylusToCss: Found ' + stylusAssets.length + ' Stylus asset(s), but no Stylus compiler is available. Please install Stylus in your project so compileStylusToCss can require it.'));
                return setImmediate(cb);
            }
        }
        async.each(stylusAssets, function (stylusAsset, cb) {
            var nonInlineAncestor = stylusAsset.nonInlineAncestor,
                stylusRenderer = stylus(stylusAsset.text);
            // If the Stylus asset has a file:// url, tell the renderer so relative urls in @import statements work:
            if (/^file:/.test(nonInlineAncestor.url)) {
                stylusRenderer.set('paths', [path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))]);
            }
            stylusRenderer.render(passError(cb, function (cssText) {
                var cssAsset = new AssetGraph.Css({
                    text: cssText
                });
                if (stylusAsset.url) {
                    cssAsset.url = stylusAsset.url.replace(/\.styl$|$/, cssAsset.defaultExtension);
                }
                stylusAsset.replaceWith(cssAsset);
                cb();
            }));
        }, cb);
    };
};

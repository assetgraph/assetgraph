var path = require('path'),
    _ = require('underscore'),
    async = require('async'),
    urlTools = require('urltools'),
    passError = require('passerror'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    var stylus;
    try {
        stylus = require('stylus');
    } catch (e) {
        throw new Error('transforms.compileStylusToCss: The "stylus" module is required. Please run "npm install stylus" and try again (tested with version 0.23.0).');
    }

    return function compileStylusToCss(assetGraph, cb) {
        async.each(assetGraph.findAssets(_.extend({type: 'Stylus'}, queryObj)), function (stylusAsset, cb) {
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

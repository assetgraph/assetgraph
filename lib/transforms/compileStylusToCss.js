var path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    stylus = require('stylus'),
    urlTools = require('../util/urlTools'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function compileStylusToCss(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'Stylus'}, queryObj)))
            .parEach(function (stylusAsset) {
                var stylusOptions = {},
                    nonInlineAncestor = stylusAsset.nonInlineAncestor,
                    stylusRenderer = stylus(stylusAsset.text);
                // If the Stylus asset has a file:// url, tell the renderer so relative urls in @import statements work:
                if (/^file:/.test(nonInlineAncestor.url)) {
                    stylusRenderer.set('paths', [path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))]);
                }
                stylusRenderer.render(this.into(stylusAsset.id));
            })
            .parEach(function (stylusAsset) {
                var cssAsset = new assets.Css({
                    text: this.vars[stylusAsset.id]
                });
                if (stylusAsset.url) {
                    cssAsset.url = stylusAsset.url.replace(/\.styl$|$/, cssAsset.defaultExtension);
                }
                stylusAsset.replaceWith(cssAsset);
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

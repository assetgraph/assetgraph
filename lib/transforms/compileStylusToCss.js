var path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    urlTools = require('urltools'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    var stylus;
    try {
        stylus = require('stylus');
    } catch (e) {
        throw new Error('transforms.compileStylusToCss: The "stylus" module is required. Please run "npm install stylus" and try again (tested with version 0.23.0).');
    }

    return function compileStylusToCss(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'Stylus'}, queryObj)))
            .parEach(function (stylusAsset) {
                var nonInlineAncestor = stylusAsset.nonInlineAncestor,
                    stylusRenderer = stylus(stylusAsset.text);
                // If the Stylus asset has a file:// url, tell the renderer so relative urls in @import statements work:
                if (/^file:/.test(nonInlineAncestor.url)) {
                    stylusRenderer.set('paths', [path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))]);
                }
                stylusRenderer.render(this.into(stylusAsset.id));
            })
            .parEach(function (stylusAsset) {
                var cssAsset = new AssetGraph.Css({
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
            })['catch'](cb);
    };
};

var Path = require('path'),
    accord = require('accord'),
    _ = require('lodash'),
    async = require('async'),
    urlTools = require('urltools'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function compileStylusToCss(assetGraph, cb) {
        var assets = assetGraph.findAssets(
            _.extend({type: 'Stylus'}, queryObj)
        );
        if (assets.length === 0) {
            cb();
            return;
        }
        var stylus = accord.load('stylus');
        async.each(assets, function (asset, cb) {
            var nonInlineAncestor = asset.nonInlineAncestor;
            var options = {
                filename: urlTools.fileUrlToFsPath(nonInlineAncestor.url)
            };
            // If the Stylus asset has a file:// url, tell the renderer so
            // relative urls in @import statements work:
            if (/^file:/.test(nonInlineAncestor.url)) {
                options.paths = [
                    Path.dirname(options.filename)
                ];
            }
            stylus.render(asset.text, options).done(
                function (data) {
                    var cssAsset = new AssetGraph.Css({text: data});
                    if (asset.url) {
                        cssAsset.url = asset.url.replace(
                            /\.styl$|$/,
                            cssAsset.defaultExtension
                        );
                    }
                    asset.replaceWith(cssAsset);
                    cb();
                },
                function (err) { cb(err); }
            );
        }, cb);
    };
};

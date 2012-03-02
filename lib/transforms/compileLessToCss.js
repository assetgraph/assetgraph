var path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    urlTools = require('../util/urlTools'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function compileLessToCss(assetGraph, cb) {
        var less;

        try {
            less = require('less');
        } catch (e) {
            return process.nextTick(function () {
                cb(new Error('transforms.compileLessToCss: The "less" module is required. Please run "npm install less" and try again (tested with version 1.2.1).'));
            });
        }

        seq(assetGraph.findAssets(_.extend({type: 'Less'}, queryObj)))
            .parEach(function (lessAsset) {
                var lessOptions = {},
                    nonInlineAncestor = lessAsset.nonInlineAncestor;
                // If the Less asset has a file:// url, add its directory to the Less parser's search path
                // so @import statements work:
                if (/^file:/.test(nonInlineAncestor.url)) {
                    lessOptions.paths = [path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))];
                }
                less.render(lessAsset.text, lessOptions, this.into(lessAsset.id));
            })
            .parEach(function (lessAsset) {
                var cssAsset = new assets.Css({
                    text: this.vars[lessAsset.id]
                });
                if (lessAsset.url) {
                    cssAsset.url = lessAsset.url.replace(/\.less$|$/, cssAsset.defaultExtension);
                }
                lessAsset.replaceWith(cssAsset);
                cssAsset.incomingRelations.forEach(function (incomingRelation) {
                    if (incomingRelation.type === 'HtmlStyle') {
                        var relAttributeValue = incomingRelation.node.getAttribute('rel');
                        if (relAttributeValue) {
                            incomingRelation.node.setAttribute('rel', relAttributeValue.replace(/\bstylesheet\/less\b/, 'stylesheet'));
                            incomingRelation.from.markDirty();
                        }
                    }
                });
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

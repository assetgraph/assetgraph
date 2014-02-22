var path = require('path'),
    _ = require('underscore'),
    async = require('async'),
    urlTools = require('urltools'),
    passError = require('passerror'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    var less;
    try {
        less = require('less');
    } catch (e) {
        throw new Error('transforms.compileLessToCss: The "less" module is required. Please run "npm install less" and try again (tested with version 1.5.1).');
    }

    return function compileLessToCss(assetGraph, cb) {
        async.each(assetGraph.findAssets(_.extend({type: 'Less'}, queryObj)), function (lessAsset, cb) {
            var lessOptions = {relativeUrls: true},
                nonInlineAncestor = lessAsset.nonInlineAncestor;
                // If the Less asset has a file:// url, add its directory to the Less parser's search path
            // so @import statements work:
            if (/^file:/.test(nonInlineAncestor.url)) {
                lessOptions.paths = [path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))];
            }
            try {
                less.render(lessAsset.text, lessOptions, passError(cb, function (cssText) {
                    var cssAsset = new AssetGraph.Css({
                        text: cssText
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
                    cb();
                }));
            } catch (e) {
                cb(new Error('Less compiler threw an exception: ' + require('util').inspect(e)));
            }
        }, cb);
    };
};

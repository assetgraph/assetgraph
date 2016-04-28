var Path = require('path'),
    accord = require('accord'),
    _ = require('lodash'),
    async = require('async'),
    urlTools = require('urltools'),
    passError = require('passerror'),
    errors = require('../errors'),
    AssetGraph = require('../');

function formatLessErrorMessage(err, asset) {
    // err can either be a string or an error object
    if (typeof err === 'string') {
        return err;
    } else {
        var fileName = err.filename === 'input' ? asset.urlOrDescription : Path.relative(process.cwd(), err.filename);
        // Assume error object
        return err.message + ' in ' + fileName + (typeof err.line === 'number' ? ' at line ' + err.line + (typeof err.column === 'number' ? ', column ' + err.column : '') : '') +
            (typeof err.extract !== 'undefined' ? ':\n' + err.extract.join('\n') : '');
    }
}

module.exports = function (queryObj, options) {
    options = options || {};
    return function compileLessToCss(assetGraph, cb) {
        var assets = assetGraph.findAssets(
            _.extend({type: 'Less'}, queryObj)
        );
        if (assets.length === 0) {
            cb();
            return;
        }
        var less = accord.load('less');
        async.each(assets, function (asset, cb) {
            var nonInlineAncestor = asset.nonInlineAncestor;
            var lessOptions = {
                relativeUrls: true,
                filename: urlTools.fileUrlToFsPath(nonInlineAncestor.url),
                sourcemap: options.sourceMaps
            };
            // If the Less asset has a file:// url, add its directory to the
            // Less parser's search path so @import statements work:
            if (/^file:/.test(nonInlineAncestor.url) && options.filename) {
                options.paths = [Path.dirname(options.filename)];
            }
            less.render(asset.text, lessOptions).done(
                function (data) {
                    var sourceMap;
                    if (options.sourceMaps) {
                        sourceMap = data.sourcemap;
                        if (sourceMap) {
                            if (Array.isArray(sourceMap.sources)) {
                                sourceMap.sources = sourceMap.sources.map(urlTools.fsFilePathToFileUrl);
                            }
                            if (!options.sourcesContent) {
                                sourceMap.sourcesContent = undefined;
                            }
                        }
                    }
                    var cssAsset = new AssetGraph.Css({
                        text: data.result,
                        sourceMap: sourceMap,
                        sourceUrl: asset.url
                    });
                    if (asset.url) {
                        cssAsset.url = asset.url.replace(
                            /\.less$|$/,
                            cssAsset.defaultExtension
                        );
                    }
                    asset.replaceWith(cssAsset);
                    cb();
                },
                function (err) {
                    assetGraph.emit(
                        'warn',
                        new errors.ParseError(
                            formatLessErrorMessage(err, asset)
                        )
                    );
                    cb();
                }
            );
        }, passError(cb, function () {
            if (assetGraph.followRelations) {
                assetGraph
                    .populate({from: {type: 'Css'}})
                    .run(cb);
            } else {
                cb();
            }
        }));
    };
};

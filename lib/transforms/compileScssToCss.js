var Path = require('path'),
    urlTools = require('urltools'),
    accord = require('accord-papandreou'),
    _ = require('lodash'),
    async = require('async'),
    passError = require('passerror'),
    errors = require('../errors'),
    AssetGraph = require('../');

function formatScssErrorMessage(err, asset) {
    // err can either be a string or an error object
    if (typeof err === 'string') {
        var matches = err.match(/^(.*?):(\d+): error: (.*)/);
        if (matches) {
            err = {
                fileName: matches[1],
                line: Number(matches[2]),
                message: matches[3]
            };
        } else {
            matches = err.match(/^(.*) in (.*) at line (\d+), column (\d+)$/);
            err = {
                fileName: matches[2],
                line: Number(matches[3]),
                column: Number(matches[4]),
                message: matches[1]
            };
        }
    }

    ['file', 'fileName'].forEach(function (fileNamePropertyName) {
        if (typeof err[fileNamePropertyName] === 'string') {
            if (err[fileNamePropertyName] === 'source string' || err[fileNamePropertyName] === 'stdin') {
                err[fileNamePropertyName] = Path.relative(process.cwd(), asset.urlOrDescription.replace(/^file:\/\//, ''));
            } else {
                err[fileNamePropertyName] = Path.relative(process.cwd(), err[fileNamePropertyName]);
            }
        }
    });

    return err.message + ' in ' + (err.file || err.fileName) + ('line' in err ? ' at line ' + err.line + ('column' in err ? ', column ' + err.column : '') : '') +
            ('extract' in err ? ':\n' + err.extract.join('\n') : '');
}

module.exports = function (queryObj) {
    var scss;

    return function compileScssToCss(assetGraph, cb) {
        var assets = assetGraph.findAssets(
            _.extend({type: 'Scss'}, queryObj)
        );
        if (assets.length === 0) {
            cb();
            return;
        }

        if (!scss) {
            try {
                scss = accord.load('scss');
            } catch (e) {
                assetGraph.emit('warn', new Error('Your dependency graph contains ' + assets.length + ' .scss files. Please `npm install --save node-sass` in order to have them compiled'));
                return cb();
            }
        }

        async.each(assets, function (asset, cb) {
            var nonInlineAncestor = asset.nonInlineAncestor;
            var options = {
            };
            // If the Scss asset has a file:// url, add its directory to the
            // Scss parser's search path so @import statements work:
            if (/^file:/.test(nonInlineAncestor.url)) {
                options.includePaths = [assetGraph.root.replace(/^file:\/\//, ''), Path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))];
            }
            scss.render(asset.text, options).done(
                function (data) {
                    var cssAsset = new AssetGraph.Css({text: data.result});
                    if (asset.url) {
                        cssAsset.url = asset.url.replace(
                            /\.scss$|$/,
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
                            formatScssErrorMessage(err, asset)
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

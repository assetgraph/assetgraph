var Path = require('path'),
    _ = require('underscore'),
    async = require('async'),
    urlTools = require('urltools'),
    errors = require('../errors'),
    AssetGraph = require('../');

function formatLessErrorMessage(err, lessAsset) { // err can either be a string or an error object
    if (typeof err === 'string') {
        return err;
    } else {
        var fileName = err.filename === 'input' ? lessAsset.urlOrDescription : Path.relative(process.cwd(), err.filename);
        // Assume error object
        return err.message + ' in ' + fileName + ('line' in err ? ' at line ' + err.line + ('column' in err ? ', column ' + err.column : '') : '') +
            ('extract' in err ? ':\n' + err.extract.join('\n') : '');
    }
}

module.exports = function (queryObj) {
    return function compileLessToCss(assetGraph, cb) {
        var less,
            lessAssets = assetGraph.findAssets(_.extend({type: 'Less'}, queryObj));
        if (lessAssets.length > 0) {
            try {
                less = require('less');
            } catch (e) {
                assetGraph.emit('warn', new Error('compileLessToCss: Found ' + lessAssets.length + ' less asset(s), but no less compiler is available. Please install less in your project so compileLessToCss can require it.'));
                return setImmediate(cb);
            }
        }
        async.each(lessAssets, function (lessAsset, cb) {
            var lessOptions = {relativeUrls: true},
                nonInlineAncestor = lessAsset.nonInlineAncestor;
            // If the Less asset has a file:// url, add its directory to the Less parser's search path
            // so @import statements work:
            if (/^file:/.test(nonInlineAncestor.url)) {
                lessOptions.paths = [Path.dirname(urlTools.fileUrlToFsPath(nonInlineAncestor.url))];
            }

            var parser = new less.Parser(lessOptions);

            parser.parse(lessAsset.text, function (err, root) {
                if (err) {
                    assetGraph.emit('warn', new errors.ParseError(formatLessErrorMessage(err, lessAsset)));
                    return cb();
                }

                var cssText;
                try {
                    cssText = root.toCSS();
                } catch (e) {
                    assetGraph.emit('warn', new Error(formatLessErrorMessage(e, lessAsset)));
                    return cb();
                }

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
            });
        }, cb);
    };
};

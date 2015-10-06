var _ = require('lodash'),
    os = require('os'),
    uglifyJs = require('uglify-js'),
    passError = require('passerror'),
    errors = require('../errors'),
    compressorByName = {},
    async = require('async');

compressorByName.uglifyJs = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({}, compressorOptions);
    var mangleOptions = _.defaults({}, _.pick(javaScript.serializationOptions, ['screw_ie8']), this.assetGraph && _.pick(this.assetGraph.javaScriptSerializationOptions, ['screw_ie8']), compressorOptions.mangleOptions);
    delete compressorOptions.mangleOptions;
    _.defaults(compressorOptions, _.pick(javaScript.serializationOptions, ['side_effects', 'screw_ie8']), this.assetGraph && _.pick(this.assetGraph.javaScriptSerializationOptions, ['side_effects', 'screw_ie8']));
    setImmediate(function () {
        var uglifyAst = uglifyJs.parse(javaScript.text);
        uglifyAst.figure_out_scope();

        var compressor = new uglifyJs.Compressor(compressorOptions);

        compressor.warn = function (message, propertyByName) {
            var warning = new errors.UglifyJsWarning(_.defaults({
                asset: javaScript,
                message: message.replace(/\{([^\}]+)\}/g, function ($0, propertyName) {
                    if (propertyName === 'file') {
                        return javaScript.urlOrDescription;
                    } else {
                        return propertyByName[propertyName] || 'unknown';
                    }
                })
            }, propertyByName));
            assetGraph.emit('warning', warning);
        };

        uglifyAst.transform(compressor);
        uglifyAst.figure_out_scope();
        uglifyAst.compute_char_frequency(mangleOptions);
        uglifyAst.mangle_names(mangleOptions);

        var stream = uglifyJs.OutputStream({ comments: true });
        uglifyAst.print(stream);

        cb(null, new assetGraph.JavaScript({
            lastKnownByteLength: javaScript.lastKnownByteLength, // I know, I know
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            text: stream.toString()
        }));
    });
};

compressorByName.yuicompressor = function (assetGraph, javaScript, compressorOptions, cb) {
    var yuicompressor;
    try {
        yuicompressor = require('yui-compressor');
    } catch (e) {
        return cb(new Error('transforms.compressJavaScript: node-yui-compressor not found. Please run \'npm install yui-compressor\' and try again (tested with version 0.1.3).'));
    }
    compressorOptions = compressorOptions || {};
    yuicompressor.compile(javaScript.text, compressorOptions, passError(cb, function (compressedText) {
        cb(null, new assetGraph.JavaScript({
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            text: compressedText
        }));
    }));
};

compressorByName.closurecompiler = function (assetGraph, javaScript, compressorOptions, cb) {
    var closurecompiler;
    try {
        closurecompiler = require('closure-compiler');
    } catch (e) {
        return cb(new Error('transforms.compressJavaScript: node-closure-compiler not found. Please run \'npm install closure-compiler\' and try again (tested with version 0.1.1).'));
    }
    compressorOptions = compressorOptions || {};
    closurecompiler.compile(javaScript.text, compressorOptions, passError(cb, function (compressedText) {
        cb(null, new assetGraph.JavaScript({
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            text: compressedText
        }));
    }));
};

module.exports = function (queryObj, compressorName, compressorOptions) {
    if (!compressorName) {
        compressorName = 'uglifyJs';
    }
    if (!(compressorName in compressorByName)) {
        throw new Error('transforms.compressJavaScript: Unknown compressor: ' + compressorName);
    }
    return function compressJavaScript(assetGraph, cb) {
        async.eachLimit(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)), os.cpus().length + 1, function (javaScript, cb) {
            compressorByName[compressorName](assetGraph, javaScript, compressorOptions, passError(cb, function (compressedJavaScript) {
                javaScript.replaceWith(compressedJavaScript);
                compressedJavaScript.serializationOptions = _.extend({}, javaScript.serializationOptions);
                compressedJavaScript.initialComments = javaScript.initialComments;
                javaScript.unload();
                cb();
            }));
        }, cb);
    };
};

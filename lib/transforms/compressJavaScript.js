var _ = require('underscore'),
    os = require('os'),
    seq = require('seq'),
    uglifyJs = require('uglify-js'),
    childProcess = require('child_process'),
    passError = require('passerror'),
    errors = require('../errors'),
    compressorByName = {};

require('bufferjs');

compressorByName.uglifyJs = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({}, compressorOptions);
    process.nextTick(function () {
        javaScript.parseTree.figure_out_scope();
        var compressor = uglifyJs.Compressor(compressorOptions);
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
        cb(null, new assetGraph.JavaScript({
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            parseTree: javaScript.parseTree.clone().transform(compressor)
        }));
    });
};

compressorByName.yuicompressor = function (assetGraph, javaScript, compressorOptions, cb) {
    var yuicompressor;
    try {
        yuicompressor = require('yui-compressor');
    } catch (e) {
        return cb(new Error("transforms.compressJavaScript: node-yui-compressor not found. Please run 'npm install yui-compressor' and try again (tested with version 0.1.3)."));
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
        return cb(new Error("transforms.compressJavaScript: node-closure-compiler not found. Please run 'npm install closure-compiler' and try again (tested with version 0.1.1)."));
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
        throw new Error("transforms.compressJavaScript: Unknown compressor: " + compressorName);
    }
    return function compressJavaScript(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)))
            .parEach(os.cpus().length + 1, function (javaScript) {
                compressorByName[compressorName](assetGraph, javaScript, compressorOptions, this.into(javaScript.id));
            })
            .parEach(function (javaScript) {
                var compressedJavaScript = this.vars[javaScript.id];
                javaScript.replaceWith(compressedJavaScript);
                // FIXME: These belong elsewhere:
                compressedJavaScript.quoteChar = javaScript.quoteChar;
                compressedJavaScript.initialComments = javaScript.initialComments;
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

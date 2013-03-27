var _ = require('underscore'),
    os = require('os'),
    seq = require('seq'),
    uglifyJs = require('uglify-js'),
    childProcess = require('child_process'),
    passError = require('passerror'),
    compressorsByName = {};

require('bufferjs');

compressorsByName.uglifyJs = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({}, compressorOptions);
    process.nextTick(function () {
        javaScript.parseTree.figure_out_scope();
        var compressor = uglifyJs.Compressor(compressorOptions);
        cb(null, new assetGraph.JavaScript({
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            parseTree: javaScript.parseTree.clone().transform(compressor)
        }));
    });
};

compressorsByName.yuicompressor = function (assetGraph, javaScript, compressorOptions, cb) {
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

compressorsByName.closurecompiler = function (assetGraph, javaScript, compressorOptions, cb) {
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
    if (!(compressorName in compressorsByName)) {
        throw new Error("transforms.compressJavaScript: Unknown compressor: " + compressorName);
    }
    return function compressJavaScript(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)))
            .parEach(os.cpus().length + 1, function (javaScript) {
                compressorsByName[compressorName](assetGraph, javaScript, compressorOptions, this.into(javaScript.id));
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

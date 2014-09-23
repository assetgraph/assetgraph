var _ = require('lodash'),
    os = require('os'),
    seq = require('seq'),
    AssetGraph = require('../'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    passError = require('passerror'),
    errors = require('../errors'),
    compressorByName = {};

compressorByName.uglifyJs = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({}, compressorOptions);
    var mangleOptions = compressorOptions.mangleOptions || {};
    delete compressorOptions.mangleOptions;
    setImmediate(function () {
        var newAst = javaScript.parseTree.clone();
        newAst.figure_out_scope();
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

        newAst.transform(compressor);
        newAst.figure_out_scope();
        newAst.compute_char_frequency(mangleOptions);
        newAst.mangle_names(mangleOptions);

        cb(null, new assetGraph.JavaScript({
            lastKnownByteLength: javaScript.lastKnownByteLength, // I know, I know
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            parseTree: newAst
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
        seq(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)))
            .parEach(os.cpus().length + 1, function (javaScript) {
                compressorByName[compressorName](assetGraph, javaScript, compressorOptions, this.into(javaScript.id));
            })
            .parEach(function (javaScript) {
                var compressedJavaScript = this.vars[javaScript.id];
                javaScript.replaceWith(compressedJavaScript);
                // FIXME: These belong elsewhere:
                compressedJavaScript.serializationOptions = _.extend({}, javaScript.serializationOptions);
                compressedJavaScript.initialComments = javaScript.initialComments;
                this();
            })
            .seq(function () {
                cb();
            })['catch'](cb);
    };
};

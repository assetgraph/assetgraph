var _ = require('underscore'),
    seq = require('seq'),
    uglify = require('uglify-js'),
    yuicompressor = require('yui-compressor'),
    closurecompiler = require('closure-compiler/lib/closure-compiler'), // https://github.com/Tim-Smart/node-closure/pull/2
    passError = require('../util/passError'),
    assets = require('../assets'),
    compressorsByName = {};

compressorsByName.uglify = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({no_warnings: true}, compressorOptions);
    process.nextTick(function () {
        cb(null, new assets.JavaScript({
            parseTree: uglify.uglify.ast_squeeze(uglify.uglify.ast_mangle(javaScript.parseTree), compressorOptions)
        }));
    });
};

compressorsByName.yuicompressor = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = compressorOptions || {};
    // FIXME: Add error handling to the yui-compressor module
    yuicompressor.compile(assetGraph.getAssetText(javaScript), compressorOptions, function (compressedText) {
        cb(null, new assets.JavaScript({
            text: compressedText
        }));
    });
};

compressorsByName.closurecompiler = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = compressorOptions || {};
    // FIXME: Add error handling to the closure-compiler module
    closurecompiler.compile(assetGraph.getAssetText(javaScript), compressorOptions, function (compressedText) {
        cb(null, new assets.JavaScript({
            text: compressedText
        }));
    });
};

module.exports = function (queryObj, compressorName, compressorOptions) {
    if (!compressorName) {
        compressorName = 'uglify';
    }
    if (!(compressorName in compressorsByName)) {
        throw new Error("transforms.compressJavaScript: Unknown compressor: " + compressorName);
    }
    return function compressJavaScript(assetGraph, cb) {
        seq(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)))
            .parEach(function (javaScript) {
                compressorsByName[compressorName](assetGraph, javaScript, compressorOptions, this.into(javaScript.id));
            })
            .parEach(function (javaScript) {
                var compressedJavaScript = this.vars[javaScript.id];
                assetGraph.replaceAsset(javaScript, compressedJavaScript);
                assetGraph.populateRelationsToExistingAssets(compressedJavaScript, javaScript);
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

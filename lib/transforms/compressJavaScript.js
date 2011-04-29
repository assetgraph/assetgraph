var _ = require('underscore'),
    seq = require('seq'),
    uglify = require('uglify-js'),
    yuicompressor = require('yui-compressor'),
    error = require('../error'),
    assets = require('../assets'),
    compressorsByName = {};

compressorsByName.uglify = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({no_warnings: true}, compressorOptions);
        javaScript.getParseTree(error.passToFunction(cb, function (parseTree) {
        cb(null, new assets.JavaScript({
            parseTree: uglify.uglify.ast_squeeze(uglify.uglify.ast_mangle(parseTree), compressorOptions)
        }));
    }));
};

compressorsByName.yuicompressor = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = compressorOptions || {};
    assetGraph.getAssetText(javaScript, error.passToFunction(cb, function (text) {
        // FIXME: Add error handling to the yui-compressor module
        yuicompressor.compile(text, compressorOptions, function (compressedText) {
            cb(null, new assets.JavaScript({
                decodedSrc: compressedText
            }));
        });
    }));
};

module.exports = function (queryObj, compressorName, compressorOptions) {
    if (!compressorName) {
        compressorName = 'uglify';
    }
    if (!(compressorName in compressorsByName)) {
        throw new Error("transforms.compressJavaScript: Unknown compressor: " + compressorName);
    }
    return function compressJavaScript(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)))
            .parEach(function (javaScript) {
                compressorsByName[compressorName](assetGraph, javaScript, compressorOptions, this.into(javaScript.id));
            })
            .parEach(function (javaScript) {
                var compressedJavaScript = this.vars[javaScript.id];
                assetGraph.replaceAsset(javaScript, compressedJavaScript);
                assetGraph.populateRelationsToExistingAssets(compressedJavaScript, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

var _ = require('underscore'),
    seq = require('seq'),
    uglify = require('uglify-js'),
    error = require('../error'),
    assets = require('../assets'),
    compressorsByName = {};

compressorsByName.uglify = function (assetGraph, javaScript, cb) {
    javaScript.getParseTree(error.passToFunction(cb, function (parseTree) {
        var incomingRelations = assetGraph.findRelations({to: javaScript}),
            compressedJavaScript = new assets.JavaScript({
                url: javaScript.url,
                parseTree: uglify.uglify.ast_squeeze(uglify.uglify.ast_mangle(parseTree), {no_warnings: true})
            });
        incomingRelations.forEach(function (incomingRelation) {
            assetGraph.removeRelation(incomingRelation);
        });
        assetGraph.removeAsset(javaScript);
        assetGraph.addAsset(compressedJavaScript);
        incomingRelations.forEach(function (incomingRelation) {
            incomingRelation.to = compressedJavaScript;
            assetGraph.addRelation(incomingRelation);
        });
        assetGraph.populateRelationsToExistingAssets(compressedJavaScript, cb);
    }));
};

module.exports = function (queryObj, compressorName) {
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
                compressorsByName[compressorName](assetGraph, javaScript, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

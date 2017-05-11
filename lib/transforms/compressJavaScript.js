var _ = require('lodash');
var os = require('os');
var Promise = require('bluebird');
var uglifyJs = require('uglify-js');
var errors = require('../errors');
var compressorByName = {};

compressorByName.uglifyJs = function (assetGraph, javaScript, compressorOptions) {
    compressorOptions = compressorOptions || {};
    var sourceMaps = compressorOptions.sourceMaps;
    compressorOptions = _.extend({}, _.omit(compressorOptions, 'sourceMaps'));
    var mangleOptions = _.defaults({}, _.pick(javaScript.serializationOptions, ['screw_ie8']), this.assetGraph && _.pick(this.assetGraph.javaScriptSerializationOptions, ['screw_ie8']), compressorOptions.mangleOptions);
    delete compressorOptions.mangleOptions;
    _.defaults(compressorOptions, _.pick(javaScript.serializationOptions, ['side_effects', 'screw_ie8']), this.assetGraph && _.pick(this.assetGraph.javaScriptSerializationOptions, ['side_effects', 'screw_ie8']));

    var text,
        sourceMap;
    if (sourceMaps) {
        var textAndSourceMap = javaScript.textAndSourceMap;
        text = textAndSourceMap.text;
        sourceMap = textAndSourceMap.sourceMap;
    } else {
        text = javaScript.text;
    }

    // If the source ends with one or more comment, add an empty statement at the end so there's a token
    // for the UglifyJS parser to attach them to (workaround for https://github.com/mishoo/UglifyJS2/issues/180)
    if (/(?:\/\/[^\r\n]*|\*\/)[\r\s\n]*$/.test(text)) {
        text += '\n;';
    }

    var result = uglifyJs.minify(text, {
        sourceMap: { content: sourceMap },
        compress: compressorOptions,
        mangle: mangleOptions,
        output: { comments: true, source_map: true, ast: true }
    });
    if (result.error) {
        return Promise.reject(new errors.ParseError({
            message: 'Parse error in ' + javaScript.urlOrDescription + '\n' + result.error.message + ' (line ' + result.error.line + ', column ' + (result.error.col + 1) + ')',
            line: result.error.line,
            column: result.error.col + 1,
            asset: javaScript
        }));
    }
    var outText = result.code;
    // Workaround for https://github.com/mishoo/UglifyJS2/issues/180
    // so we avoid throwing away a trailing comment, which would be especially
    // bad if it contains an inline source map with sourcesContent.
    if (result.ast.end && result.ast.end.comments_before && !result.ast.end._comments_dumped) {
        result.ast.end.comments_before.forEach(function (comment) {
            if (assetGraph.JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput(comment)) {
                if (comment.type === 'comment1') {
                    outText += '//' + comment.value + '\n';
                } else if (comment.type === 'comment2') {
                    outText += '/*' + comment.value + '*/';
                }
            }
        }, this);
    }

    var compressedJavaScript = new assetGraph.JavaScript({
        lastKnownByteLength: javaScript.lastKnownByteLength, // I know, I know
        copyrightNoticeComments: javaScript.copyrightNoticeComments,
        text: outText,
        isDirty: true,
        isMinified: javaScript.isMinified,
        isPretty: javaScript.isPretty,
        sourceMap: result.map
    });
    return Promise.resolve(compressedJavaScript);
};

compressorByName.yuicompressor = function (assetGraph, javaScript, compressorOptions) {
    var yuicompressor;
    try {
        yuicompressor = require('yui-compressor');
    } catch (e) {
        throw new Error('transforms.compressJavaScript: node-yui-compressor not found. Please run \'npm install yui-compressor\' and try again (tested with version 0.1.3).');
    }
    compressorOptions = compressorOptions || {};
    return Promise.fromNode(function (cb) {
        yuicompressor.compile(javaScript.text, compressorOptions);
    }).then(function (compressedText) {
        return new assetGraph.JavaScript({
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            text: compressedText
        });
    });
};

compressorByName.closurecompiler = function (assetGraph, javaScript, compressorOptions) {
    var closurecompiler;
    try {
        closurecompiler = require('closure-compiler');
    } catch (e) {
        throw new Error('transforms.compressJavaScript: node-closure-compiler not found. Please run \'npm install closure-compiler\' and try again (tested with version 0.1.1).');
    }
    compressorOptions = compressorOptions || {};
    return Promise.fromNode(function (cb) {
        closurecompiler.compile(javaScript.text, compressorOptions, cb);
    }).then(function (compressedText) {
        return new assetGraph.JavaScript({
            copyrightNoticeComments: javaScript.copyrightNoticeComments,
            text: compressedText
        });
    });
};

module.exports = function (queryObj, compressorName, compressorOptions) {
    if (!compressorName) {
        compressorName = 'uglifyJs';
    }
    if (!compressorByName[compressorName]) {
        throw new Error('transforms.compressJavaScript: Unknown compressor: ' + compressorName);
    }
    return function compressJavaScript(assetGraph) {
        return Promise.map(assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)), function (javaScript) {
            return compressorByName[compressorName](assetGraph, javaScript, compressorOptions).then(function (compressedJavaScript) {
                javaScript.replaceWith(compressedJavaScript);
                compressedJavaScript.serializationOptions = _.extend({}, javaScript.serializationOptions);
                compressedJavaScript.initialComments = javaScript.initialComments;
                javaScript.unload();
            }, function (err) {
                assetGraph.emit('warn', err);
            });
        }, {concurrency: os.cpus().length + 1});
    };
};

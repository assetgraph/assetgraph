const _ = require('lodash');
const os = require('os');
const Promise = require('bluebird');
const uglifyJs = require('uglify-js');
const errors = require('../errors');
const compressorByName = {};

compressorByName.uglifyJs = async (assetGraph, javaScript, compressorOptions) => {
    compressorOptions = compressorOptions || {};
    const sourceMaps = compressorOptions.sourceMaps;
    compressorOptions = Object.assign({}, _.omit(compressorOptions, 'sourceMaps'));
    const mangleOptions = _.defaults({}, _.pick(javaScript.serializationOptions, ['screw_ie8']), _.pick(assetGraph.javaScriptSerializationOptions, ['screw_ie8']), compressorOptions.mangleOptions);
    delete compressorOptions.mangleOptions;
    _.defaults(compressorOptions, _.pick(javaScript.serializationOptions, ['side_effects', 'screw_ie8']), _.pick(assetGraph.javaScriptSerializationOptions, ['side_effects', 'screw_ie8']));

    let text;
    let sourceMap;
    if (sourceMaps) {
        ({ text, sourceMap } = javaScript.textAndSourceMap);
    } else {
        text = javaScript.text;
    }

    // If the source ends with one or more comment, add an empty statement at the end so there's a token
    // for the UglifyJS parser to attach them to (workaround for https://github.com/mishoo/UglifyJS2/issues/180)
    if (/(?:\/\/[^\r\n]*|\*\/)[\r\s\n]*$/.test(text)) {
        text += '\n;';
    }

    const { error, ast, code, map } = uglifyJs.minify(text, {
        sourceMap: { content: sourceMap },
        compress: compressorOptions,
        mangle: mangleOptions,
        output: { comments: true, source_map: true, ast: true }
    });
    if (error) {
        throw new errors.ParseError({
            message: 'Parse error in ' + javaScript.urlOrDescription + '\n' + error.message + ' (line ' + error.line + ', column ' + (error.col + 1) + ')',
            line: error.line,
            column: error.col + 1,
            asset: javaScript
        });
    }
    let outText = code;
    // Workaround for https://github.com/mishoo/UglifyJS2/issues/180
    // so we avoid throwing away a trailing comment, which would be especially
    // bad if it contains an inline source map with sourcesContent.
    if (ast.end && ast.end.comments_before && !ast.end._comments_dumped) {
        for (const comment of ast.end.comments_before) {
            if (assetGraph.JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput(comment)) {
                if (comment.type === 'comment1') {
                    outText += '//' + comment.value + '\n';
                } else if (comment.type === 'comment2') {
                    outText += '/*' + comment.value + '*/';
                }
            }
        }
    }

    return new assetGraph.JavaScript({
        lastKnownByteLength: javaScript.lastKnownByteLength, // I know, I know
        copyrightNoticeComments: javaScript.copyrightNoticeComments,
        text: outText,
        isDirty: true,
        isMinified: javaScript.isMinified,
        isPretty: javaScript.isPretty,
        sourceMap: map
    });
};

compressorByName.yuicompressor = async (assetGraph, javaScript, compressorOptions) => {
    let yuicompressor;
    try {
        yuicompressor = require('yui-compressor');
    } catch (e) {
        throw new Error('transforms.compressJavaScript: node-yui-compressor not found. Please run \'npm install yui-compressor\' and try again (tested with version 0.1.3).');
    }
    compressorOptions = compressorOptions || {};
    return new assetGraph.JavaScript({
        copyrightNoticeComments: javaScript.copyrightNoticeComments,
        text: await Promise.fromNode(cb => yuicompressor.compile(javaScript.text, compressorOptions, cb))
    });
};

compressorByName.closurecompiler = async (assetGraph, javaScript, compressorOptions) => {
    let closurecompiler;
    try {
        closurecompiler = require('closure-compiler');
    } catch (e) {
        throw new Error('transforms.compressJavaScript: node-closure-compiler not found. Please run \'npm install closure-compiler\' and try again (tested with version 0.1.1).');
    }
    compressorOptions = compressorOptions || {};
    return new assetGraph.JavaScript({
        copyrightNoticeComments: javaScript.copyrightNoticeComments,
        text: await Promise.fromNode(cb => closurecompiler.compile(javaScript.text, compressorOptions, cb))
    });
};

module.exports = (queryObj, compressorName, compressorOptions) => {
    if (!compressorName) {
        compressorName = 'uglifyJs';
    }
    if (!compressorByName[compressorName]) {
        throw new Error('transforms.compressJavaScript: Unknown compressor: ' + compressorName);
    }
    return async function compressJavaScript(assetGraph) {
        await Promise.map(assetGraph.findAssets(Object.assign({type: 'JavaScript'}, queryObj)), async javaScript => {
            try {
                const compressedJavaScript = await compressorByName[compressorName](assetGraph, javaScript, compressorOptions);
                javaScript.replaceWith(compressedJavaScript);
                compressedJavaScript.serializationOptions = Object.assign({}, javaScript.serializationOptions);
                compressedJavaScript.initialComments = javaScript.initialComments;
                javaScript.unload();
            } catch (err) {
                assetGraph.emit('warn', err);
            }
        }, {concurrency: os.cpus().length + 1});
    };
};

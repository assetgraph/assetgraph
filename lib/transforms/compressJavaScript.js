var _ = require('lodash');
var os = require('os');
var Promise = require('bluebird');
var uglifyJs = require('uglify-js');
var errors = require('../errors');
var compressorByName = {};

compressorByName.uglifyJs = function (assetGraph, javaScript, compressorOptions) {
    compressorOptions = compressorOptions || {};
    var sourceMaps = compressorOptions.sourceMaps;
    var sourcesContent = compressorOptions.sourcesContent;
    compressorOptions = _.extend({}, _.omit(compressorOptions, 'sourceMaps', 'sourcesContent'));
    var readNameCacheVars = uglifyJs.readNameCache(undefined, 'vars');
    var mangleOptions = _.defaults({
        cache: readNameCacheVars
    }, _.pick(javaScript.serializationOptions, ['screw_ie8']), this.assetGraph && _.pick(this.assetGraph.javaScriptSerializationOptions, ['screw_ie8']), compressorOptions.mangleOptions);
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

    var sourcesContentByUrl = {};
    if (sourcesContent) {
        assetGraph.findRelations({ from: javaScript, type: 'JavaScriptSourceMappingUrl' }).forEach(function (existingSourceMapRelation) {
            var existingSourceMap = existingSourceMapRelation.to;
            if (sourcesContent && existingSourceMap.parseTree && existingSourceMap.parseTree.sourcesContent && existingSourceMap.parseTree.sources) {
                for (var i = 0 ; i < existingSourceMap.parseTree.sources.length ; i += 1) {
                    if (typeof existingSourceMap.parseTree.sourcesContent[i] === 'string') {
                        var absoluteUrl = assetGraph.resolveUrl(existingSourceMap.nonInlineAncestor.url, existingSourceMap.parseTree.sources[i]);
                        sourcesContentByUrl[absoluteUrl] = existingSourceMap.parseTree.sourcesContent[i];
                    }
                }
            }
        });
    }

    var uglifyAst = uglifyJs.parse(text);

    uglifyAst.figure_out_scope({ screw_ie8: javaScript.serializationOptions.screw_ie8, cache: readNameCacheVars });

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

    uglifyAst = uglifyAst.transform(compressor);
    uglifyAst.figure_out_scope({ screw_ie8: javaScript.serializationOptions.screw_ie8, cache: readNameCacheVars });
    uglifyAst.mangle_names(mangleOptions);
    var uglifyOutSourceMap = sourceMap && uglifyJs.SourceMap({ orig: sourceMap });
    var stream = uglifyJs.OutputStream({ comments: true, source_map: uglifyOutSourceMap });
    uglifyAst.print(stream);

    var outText = stream.toString();

    var outSourceMap = uglifyOutSourceMap && uglifyOutSourceMap.get().toJSON();

    if (outSourceMap) {
        if (sourcesContent) {
            outSourceMap.sourcesContent = outSourceMap.sources.map(function (url) {
                return sourcesContentByUrl[url] || null;
            });
        } else {
            outSourceMap.sourcesContent = undefined;
        }
    }
    var compressedJavaScript = new assetGraph.JavaScript({
        lastKnownByteLength: javaScript.lastKnownByteLength, // I know, I know
        copyrightNoticeComments: javaScript.copyrightNoticeComments,
        text: outText,
        isDirty: true,
        isMinified: javaScript.isMinified,
        isPretty: javaScript.isPretty,
        sourceMap: outSourceMap
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
            });
        }, {concurrency: os.cpus().length + 1});
    };
};

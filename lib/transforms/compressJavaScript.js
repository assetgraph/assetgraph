/*global setImmediate:true*/
// node 0.8 compat
if (typeof setImmediate === 'undefined') {
    setImmediate = process.nextTick;
}

var _ = require('underscore'),
    os = require('os'),
    seq = require('seq'),
    uglifyJs = require('uglify-js-papandreou'),
    childProcess = require('child_process'),
    passError = require('passerror'),
    compressorsByName = {};

require('bufferjs');

function shouldJavaScriptBeCompressedInExternalProcess(javaScript) {
    if (javaScript._text) {
        return javaScript._text.length > 2048;
    } else if (javaScript._rawSrc) {
        return javaScript._rawSrc.length > 2048;
    } else {
        var numNodesSeen = 0,
            queue = [javaScript.parseTree];
        while (queue.length) {
            var node = queue.pop();
            numNodesSeen += 1;
            if (numNodesSeen > 1000) {
                return true;
            }
            for (var i = 0 ; i < node.length ; i += 1) {
                if (Array.isArray(node[i])) {
                    queue.push(node[i]);
                }
            }
        }
        return false;
    }
}

compressorsByName.uglifyJs = function (assetGraph, javaScript, compressorOptions, cb) {
    compressorOptions = _.extend({no_warnings: true}, compressorOptions);
    if (shouldJavaScriptBeCompressedInExternalProcess(javaScript)) {
        var switches = []; // FIXME: Turn all compressorOptions properties into switches
        if (compressorOptions.defines) {
            Object.keys(compressorOptions.defines).forEach(function (symbol) {
                switches.push('--define', symbol + '=' + uglifyJs.uglify.gen_code(compressorOptions.defines[symbol]));
            });
        }
        if (compressorOptions.toplevel) {
            switches.push('--mangle-toplevel');
        }
        var uglifyJsBinaryPath = require.resolve('uglify-js-papandreou/bin/uglifyjs'),
            uglifyJsProcess = childProcess.spawn(uglifyJsBinaryPath, switches),
            chunks = [],
            stderrChunks = [],
            stdoutHasEnded = false,
            callbackCalled = false;

        function proceedIfStdoutHasEnded() {
            if (stdoutHasEnded && !callbackCalled) {
                callbackCalled = true;
                cb(null, new assetGraph.JavaScript({
                    rawSrc: Buffer.concat(chunks)
                }));
            }
        }
        uglifyJsProcess.stdout.on('data', function (chunk) {
            chunks.push(chunk);
        }).on('end', function () {
            stdoutHasEnded = true;
            proceedIfStdoutHasEnded();
        });
        uglifyJsProcess.stderr.on('data', function (chunk) {
            stderrChunks.push(chunk);
        });
        uglifyJsProcess.on('exit', function (exitCode) {
            if (exitCode) {
                callbackCalled = true;
                cb(new Error(uglifyJsBinaryPath + ' ' + switches.join(' ') + ' returned non-zero exit code: ' + exitCode + (stderrChunks.length > 0 ? '\nSTDERR: ' + Buffer.concat(stderrChunks).toString('utf-8') : '')));
            } else {
                proceedIfStdoutHasEnded();
            }
        });
        uglifyJsProcess.stdin.end(javaScript.rawSrc);
    } else {
        setImmediate(function () {
            cb(null, new assetGraph.JavaScript({
                copyrightNoticeComments: javaScript.copyrightNoticeComments,
                parseTree: uglifyJs.uglify.ast_squeeze(uglifyJs.uglify.ast_mangle(javaScript.parseTree, compressorOptions), compressorOptions)
            }));
        });
    }
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

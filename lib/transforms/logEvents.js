var chalk = require('chalk'),
    _ = require('lodash'),
    Path = require('path'),
    urlTools = require('urltools'),
    AssetGraph = require('../index');

function indentSubsequentLines(str, level) {
    return str.replace(/\n/g, '\n' + new Array(level + 1).join(' '));
}

function escapeRegExpMetaChars(str) {
    return str.replace(/[$\.^\(\)\[\]\{\}]/g, '\\$&');
}

module.exports = function (options) {
    var startReplRegExp;

    options = options || {};

    if (options.repl) {
        startReplRegExp = new RegExp(_.flatten(_.flatten([options.repl]).map(function (transformName) {
            return transformName.split(',');
        })).map(function (transformName) {
            return transformName.replace(/[\.\+\{\}\[\]\(\)\?\^\$]/g, '\\$&');
        }).join('|'));
    }

    return function logEvents(assetGraph) {
        var assetGraphRootRelativeToCwd = Path.relative(process.cwd(), urlTools.fileUrlToFsPath(assetGraph.root)),
            assetGraphRootRelativeToCwdRegExp = new RegExp('\\b' + escapeRegExpMetaChars(assetGraphRootRelativeToCwd) + '/', 'g'),
            cwdRegExp = new RegExp(escapeRegExpMetaChars(process.cwd() + '/'), 'g'),
            colorBySeverity = {info: 'cyan', warn: 'yellow', error: 'red'},
            symbolBySeverity = {info: 'ℹ', warn: '⚠', error: '✘'};

        function outputMessage(messageOrError, severity) {
            severity = severity || 'info';
            var message;
            if (Object.prototype.toString.call(messageOrError) === '[object Error]') {
                if (severity === 'error') {
                    message = messageOrError.stack;
                } else {
                    message = messageOrError.message;
                }
                if (messageOrError.asset) {
                    message = messageOrError.asset.urlOrDescription + ': ' + message;
                }
            } else {
                message = messageOrError;
            }
            var caption = ' ' + symbolBySeverity[severity] + ' ' + severity.toUpperCase() + ': ';

            message = message
                .replace(cwdRegExp, '')
                .replace(assetGraphRootRelativeToCwdRegExp, chalk.gray(assetGraphRootRelativeToCwd + '/'));

            console[severity](chalk[colorBySeverity[severity]](caption) + indentSubsequentLines(message, caption.length));
        }

        var firstWarningSeenDuringTransform = null,
            transformRunning = false;
        assetGraph
            .on('beforeTransform', function () {
                firstWarningSeenDuringTransform = null;
                transformRunning = true;
            })
            .on('afterTransform', function (transform, elapsedTime) {
                if (firstWarningSeenDuringTransform && options.stopOnWarning) {
                    console.error(chalk.red(' ✘ ERROR: ') + 'A warning was encountered while stopOnWarning is on, exiting with a non-zero exit code');
                    process.exit(1);
                }
                transformRunning = false;

                console.log(chalk.green(' ✔ ') + (elapsedTime / 1000).toFixed(3) + ' secs: ' + transform.name);
                if (startReplRegExp && startReplRegExp.test(transform.name)) {
                    this.transformQueue.transforms.unshift(AssetGraph.transforms.startRepl());
                }
            })
            .on('info', function (info) {
                outputMessage(info, 'info');
            })
            .on('warn', function (err) {
                // These are way too noisy
                if (options.suppressJavaScriptCommonJsRequireWarnings && err.relationType === 'JavaScriptCommonJsRequire') {
                    return;
                }
                outputMessage(err, 'warn');
                if (startReplRegExp && startReplRegExp.test('warn')) {
                    this.transformQueue.transforms.unshift(AssetGraph.transforms.startRepl());
                }
                if (transformRunning) {
                    firstWarningSeenDuringTransform = firstWarningSeenDuringTransform || err;
                } else {
                    console.error(chalk.red(' ✘ ERROR: ') + 'A warning was encountered while stopOnWarning is on, exiting with a non-zero exit code');
                    process.exit(1);
                }
            })
            .on('error', function (err) {
                outputMessage(err, 'error');
                if (startReplRegExp && startReplRegExp.test('error')) {
                    this.transformQueue.transforms.unshift(AssetGraph.transforms.startRepl());
                } else {
                    process.exit(1);
                }
            });
    };
};

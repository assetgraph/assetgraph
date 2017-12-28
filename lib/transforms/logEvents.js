const chalk = require('chalk');
const _ = require('lodash');
const Path = require('path');
const urlTools = require('urltools');
const AssetGraph = require('../AssetGraph');
const diffy = require('diffy')();
const trim = require('diffy/trim');

function indentSubsequentLines(str, level) {
    return str.replace(/\n/g, '\n' + new Array(level + 1).join(' '));
}

function escapeRegExpMetaChars(str) {
    return str.replace(/[$\.^\(\)\[\]\{\}]/g, '\\$&');
}

module.exports = ({ afterTransform, repl, stopOnWarning } = {}) => {
    let startReplRegExp;

    if (repl) {
        startReplRegExp = new RegExp(_.flatten(_.flatten([repl]).map(
            transformName => transformName.split(',')
        )).map(transformName => transformName.replace(/[\.\+\{\}\[\]\(\)\?\^\$]/g, '\\$&')).join('|'));
    }

    return function logEvents(assetGraph) {
        const assetGraphRootRelativeToCwd = Path.relative(process.cwd(), urlTools.fileUrlToFsPath(assetGraph.root));
        const assetGraphRootRelativeToCwdRegExp = new RegExp('\\b' + escapeRegExpMetaChars(assetGraphRootRelativeToCwd) + '/', 'g');
        const cwdRegExp = new RegExp('(?:file://)?' + escapeRegExpMetaChars(process.cwd() + '/'), 'g');
        const colorBySeverity = {info: 'cyan', warn: 'yellow', error: 'red'};
        const symbolBySeverity = {info: 'ℹ', warn: '⚠', error: '✘'};

        let firstWarningSeenDuringTransform = null;
        const transforms = [];
        const timings = [];

        function getTransformName(transform, timing) {
            let str = (transform && transform.name) || 'unknown';
            if (timing && timing > 200) {
                let color = 'gray';
                if (timing > 2000) {
                    color = 'red';
                } else if (timing > 1000) {
                    color = 'yellow';
                }
                str += ' ' + chalk[color]('(' + (timing / 1000).toFixed(1) + 's)');
            }
            return str;
        }

        /*eslint-disable indent*/
        diffy.render(() => trim(`
            ${
                afterTransform ?
                    transforms.slice(-5).map((transform, i) => chalk.green(' ✔ ') + getTransformName(transform, timings[i])).join('\n') :
                    ''
            }
            ${
                transformStack.length > 0 ?
                    chalk.yellow(' ➛ ') + getTransformName(transformStack[transformStack.length - 1]) + '\n' :
                    ''
            }
        `));
        /*eslint-enable indent*/

        function outputMessage(messageOrError, severity) {
            severity = severity || 'info';
            let message;
            if (Object.prototype.toString.call(messageOrError) === '[object Error]') {
                if (severity === 'error') {
                    message = messageOrError.stack;
                } else {
                    message = messageOrError.message || messageOrError.name || messageOrError.code;
                }
                if (messageOrError.asset) {
                    message = messageOrError.asset.urlOrDescription + ': ' + message;
                }
            } else {
                if (typeof messageOrError === 'string') {
                    message = messageOrError;
                } else if (typeof messageOrError.message === 'string') {
                    message = messageOrError.message;
                } else {
                    // Give up guessing. This is probably an error on the next lines...
                    message = messageOrError;
                }
            }
            const caption = ' ' + symbolBySeverity[severity] + ' ' + severity.toUpperCase() + ': ';

            message = message
                .replace(cwdRegExp, '')
                .replace(assetGraphRootRelativeToCwdRegExp, chalk.gray(assetGraphRootRelativeToCwd + '/'));

            console[severity](chalk[colorBySeverity[severity]](caption) + indentSubsequentLines(message, caption.length));
        }

        const transformStack = [logEvents];
        assetGraph
            .on('beforeTransform', function (transform) {
                firstWarningSeenDuringTransform = null;
                transformStack.push(transform);
                diffy.render();
            })
            .on('afterTransform', function (transform, elapsedTime) {
                transforms.push(transform);
                timings.push(elapsedTime);
                if (firstWarningSeenDuringTransform && stopOnWarning) {
                    console.error(chalk.red(' ✘ ERROR: ') + (transform.name ? transform.name + ': ' : '') + 'A warning was encountered while stopOnWarning is on, exiting with a non-zero exit code');
                    process.exit(1);
                }
                if (transform !== transformStack.pop()) {
                    throw new Error('logEvents: Internal error in the transformStack housekeeping');
                }

                if (startReplRegExp && startReplRegExp.test(transform.name)) {
                    this.transformQueue.transforms.unshift(AssetGraph.transforms.startRepl());
                }
                diffy.render();
            })
            .on('info', function (info) {
                outputMessage(info, 'info');
            })
            .on('warn', function (err) {
                outputMessage(err, 'warn');
                if (startReplRegExp && startReplRegExp.test('warn')) {
                    this.transformQueue.transforms.unshift(AssetGraph.transforms.startRepl());
                }
                if (transformStack.length > 0) {
                    firstWarningSeenDuringTransform = firstWarningSeenDuringTransform || err;
                } else if (stopOnWarning) {
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

const chalk = require('chalk');
const _ = require('lodash');
const Path = require('path');
const urlTools = require('urltools');
const AssetGraph = require('../AssetGraph');
const diffy = require('diffy')();
const trim = require('diffy/trim');

function renderFileSize(numBytes) {
    if (numBytes < 1000) {
        return numBytes + ' bytes';
    } else if (numBytes < 1000000) {
        return (numBytes / 1024).toFixed(1) + ' KB';
    } else if (numBytes < 1000000000) {
        return (numBytes / 1048576).toFixed(1) + ' MB';
    } else if (numBytes < 1000000000000) {
        return (numBytes / 1073741824).toFixed(1) + ' GB';
    } else {
        return (numBytes / 1099511627776).toFixed(1) + ' TB';
    }
}

function leftPad(str, width) {
    str = str.toString();
    while (width > str.length) {
        str = '          '.substr(0, width - str.length) + str;
    }
    return str;
}

function rightPad(str, width) {
    str = str.toString();
    while (width > str.length) {
        str += '          '.substr(0, width - str.length);
    }
    return str;
}

function renderStatsTable(assetGraph) {
    const countByDisplayType = {};
    const sumSizesByDisplayType = {};
    const allLoadedAssets = assetGraph.findAssets({isInline: false, isLoaded: true});
    let totalSize = 0;

    for (const asset of allLoadedAssets) {
        let displayType = asset.type;
        if (!displayType && asset.extension) {
            displayType = asset.extension;
        }
        const size = asset.rawSrc.length;
        totalSize += size;
        sumSizesByDisplayType[displayType] = (sumSizesByDisplayType[displayType] || 0) + size;
        countByDisplayType[displayType] = (countByDisplayType[displayType] || 0) + 1;
    }
    const rows = [];
    const columnWidths = [];

    function addRow(...args) {
        const row = _.flatten(args);
        for (const [i, column] of row.entries()) {
            const length = column.toString().length;
            if (!columnWidths[i] || length > columnWidths[i]) {
                columnWidths[i] = length;
            }
        }
        rows.push(row);
    }

    for (const displayType of Object.keys(countByDisplayType)) {
        const count = countByDisplayType[displayType];
        addRow(displayType, count, renderFileSize(sumSizesByDisplayType[displayType]).split(' '));
    }
    addRow('Total:', allLoadedAssets.length, renderFileSize(totalSize).split(' '));

    return rows.map(
        row => row.map((column, i) => (i === 3 ? rightPad : leftPad)(column, columnWidths[i])).join(' ')
    ).join('\n');
}

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
            ---
            ${renderStatsTable(assetGraph)}
            ---
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

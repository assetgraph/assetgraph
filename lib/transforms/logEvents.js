const chalk = require('chalk');
const _ = require('lodash');
const Path = require('path');
const urlTools = require('urltools');
const AssetGraph = require('../AssetGraph');

function indentSubsequentLines(str, level) {
  return str.replace(/\n/g, `\n${new Array(level + 1).join(' ')}`);
}

function escapeRegExpMetaChars(str) {
  return str.replace(/[$.^()[\]{}]/g, '\\$&');
}

module.exports = ({ afterTransform, repl, stopOnWarning, console } = {}) => {
  console = console || global.console;
  let startReplRegExp;

  if (repl) {
    startReplRegExp = new RegExp(
      _.flatten(
        _.flatten([repl]).map((transformName) => transformName.split(','))
      )
        .map((transformName) => transformName.replace(/[.+{}[]()?^$]/g, '\\$&'))
        .join('|')
    );
  }

  /**
   * Sets up logging of high level AssetGraph events to more easily understand
   * what is going on in the transform queue
   *
   * @module {function} logEvents
   *
   * @param {AssetGraph} assetGraph An AssetGraph instance
   *
   * @listens AssetGraph#info
   * @listens AssetGraph#warn
   * @listens AssetGraph#error
   *
   * @listens AssetGraph#beforeTransform
   * @listens AssetGraph#afterTransform
   */
  return function logEvents(assetGraph) {
    const assetGraphRootRelativeToCwd = Path.relative(
      process.cwd(),
      urlTools.fileUrlToFsPath(assetGraph.root)
    );
    const assetGraphRootRelativeToCwdRegExp = new RegExp(
      `\\b${escapeRegExpMetaChars(assetGraphRootRelativeToCwd)}/`,
      'g'
    );
    const cwdRegExp = new RegExp(
      `(?:file://)?${escapeRegExpMetaChars(`${process.cwd()}/`)}`,
      'g'
    );
    const colorBySeverity = { info: 'cyan', warn: 'yellow', error: 'red' };
    const symbolBySeverity = { info: 'ℹ', warn: '⚠', error: '✘' };

    function outputMessage(messageOrError, severity) {
      severity = severity || 'info';
      let message;
      if (Object.prototype.toString.call(messageOrError) === '[object Error]') {
        if (severity === 'error') {
          message = messageOrError.stack;
        } else {
          message =
            messageOrError.message ||
            messageOrError.name ||
            messageOrError.code;
        }
        if (messageOrError.asset) {
          const fileLineCol = [messageOrError.asset.urlOrDescription];
          if (messageOrError.line) {
            fileLineCol.push(messageOrError.line);

            if (messageOrError.column) {
              fileLineCol.push(messageOrError.col);
            }
          }
          message = `${fileLineCol.join(':')} - ${message}`;
          const incomingRelations = messageOrError.asset.incomingRelations;
          if (incomingRelations.length > 0) {
            message += `\nIncluding assets:\n    ${incomingRelations
              .map((incomingRelation) => {
                return incomingRelation.from.urlOrDescription;
              })
              .join('\n    ')}\n`;
          }
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
      const caption = ` ${
        symbolBySeverity[severity]
      } ${severity.toUpperCase()}: `;

      message = message
        .replace(cwdRegExp, '')
        .replace(
          assetGraphRootRelativeToCwdRegExp,
          chalk.gray(`${assetGraphRootRelativeToCwd}/`)
        );

      console[severity](
        chalk[colorBySeverity[severity]](caption) +
          indentSubsequentLines(message, caption.length)
      );
    }

    let firstWarningSeenDuringTransform = null;
    const transformStack = [logEvents];
    assetGraph
      .on('beforeTransform', (transform) => {
        firstWarningSeenDuringTransform = null;
        transformStack.push(transform);
      })
      .on('afterTransform', function (transform, elapsedTime) {
        if (firstWarningSeenDuringTransform && stopOnWarning) {
          console.error(
            `${
              chalk.red(' ✘ ERROR: ') +
              (transform.name ? `${transform.name}: ` : '')
            }A warning was encountered while stopOnWarning is on, exiting with a non-zero exit code`
          );
          process.exit(1);
        }
        if (transform !== transformStack.pop()) {
          throw new Error(
            'logEvents: Internal error in the transformStack housekeeping'
          );
        }

        if (afterTransform !== false) {
          console.log(
            `${chalk.green(' ✔ ') + (elapsedTime / 1000).toFixed(3)} secs: ${
              transform.name
            }`
          );
        }
        if (startReplRegExp && startReplRegExp.test(transform.name)) {
          this.transformQueue.transforms.unshift(
            AssetGraph.transforms.startRepl()
          );
        }
      })
      .on('info', (info) => {
        outputMessage(info, 'info');
      })
      .on('warn', function (err) {
        outputMessage(err, 'warn');
        if (startReplRegExp && startReplRegExp.test('warn')) {
          this.transformQueue.transforms.unshift(
            AssetGraph.transforms.startRepl()
          );
        }
        if (transformStack.length > 0) {
          firstWarningSeenDuringTransform =
            firstWarningSeenDuringTransform || err;
        } else if (stopOnWarning) {
          console.error(
            `${chalk.red(
              ' ✘ ERROR: '
            )}A warning was encountered while stopOnWarning is on, exiting with a non-zero exit code`
          );
          process.exit(1);
        }
      })
      .on('error', function (err) {
        outputMessage(err, 'error');
        if (startReplRegExp && startReplRegExp.test('error')) {
          this.transformQueue.transforms.unshift(
            AssetGraph.transforms.startRepl()
          );
        } else {
          process.exit(1);
        }
      });
  };
};

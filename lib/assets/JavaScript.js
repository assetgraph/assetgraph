/* eslint no-redeclare: "off", block-scoped-var: "off" */
const _ = require('lodash');
const esprima = require('esprima');
const escodegen = require('escodegen');
const estraverse = require('estraverse-fb');
const espurify = require('espurify');
const mozilla = require('source-map');
const repeatString = require('repeat-string');
const errors = require('../errors');
const Text = require('./Text');

class JavaScript extends Text {
  init(config) {
    super.init(config);
    this.serializationOptions = this.serializationOptions || {};

    // Boolean indicating if the asset has a global "use strict"; statement
    // Useful for wrapping the asset in an IIFE when concatenating in order to avoid leakage
    this.strict = false;
  }

  _getEscodegenOptions() {
    const outputOptions = _.defaults(
      {},
      this.serializationOptions,
      this.assetGraph && this.assetGraph.javaScriptSerializationOptions
    );
    return {
      format: {
        compact: outputOptions.compact, // Takes precedence over space, newline, and indent
        space:
          typeof outputOptions.space === 'undefined'
            ? this.isPretty || !this._toBeMinified
              ? ' '
              : ''
            : outputOptions.space,
        newline:
          typeof outputOptions.newline === 'undefined'
            ? this.isPretty || !this._toBeMinified
              ? '\n'
              : ''
            : outputOptions.newline,
        semicolons:
          typeof outputOptions.semicolons === 'undefined'
            ? this.isPretty || !this._toBeMinified
            : outputOptions.semicolons,
        parentheses:
          typeof outputOptions.parentheses === 'undefined'
            ? this.isPretty || !this._toBeMinified
            : outputOptions.parentheses,
        escapeless:
          typeof outputOptions.escapeless === 'undefined'
            ? !outputOptions.ascii_only
            : outputOptions.escapeless,
        indent: {
          style:
            typeof outputOptions.indent_level === 'number'
              ? repeatString(' ', outputOptions.indent_level)
              : this.isPretty || !this._toBeMinified
                ? '    '
                : ''
        }
      },
      comment: true
    };
  }

  get text() {
    if (typeof this._text !== 'string') {
      const parseTree = this._parseTree;
      if (parseTree) {
        this._text = this._patchUpSerializedText(
          escodegen.generate(parseTree, this._getEscodegenOptions()),
          parseTree
        );
      } else {
        this._text = this._getTextFromRawSrc();
      }
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  get sourceMap() {
    if (typeof this._sourceMap === 'undefined') {
      this._sourceMap = escodegen.generate(
        this.parseTree,
        _.defaults({ sourceMap: true }, this._getEscodegenOptions())
      );
    }
    if (typeof this._sourceMap === 'string') {
      this._sourceMap = JSON.parse(this._sourceMap);
    }
    return this._sourceMap;
  }

  _applySourceMapToParseTree() {
    const sourceMapConsumer = new mozilla.SourceMapConsumer(this._sourceMap);
    try {
      estraverse.traverse(this.parseTree, {
        enter(node) {
          if (!(node.type && node.loc)) {
            return;
          }
          const origStart = sourceMapConsumer.originalPositionFor(
            node.loc.start
          );

          if (!origStart.line) {
            delete node.loc;
            return;
          }
          const origEnd = sourceMapConsumer.originalPositionFor(node.loc.end);

          if (
            origEnd.line &&
            (origEnd.line < origStart.line || origEnd.column < origStart.column)
          ) {
            origEnd.line = null;
          }

          node.loc = {
            start: {
              line: origStart.line,
              column: origStart.column
            },
            end: origEnd.line && {
              line: origEnd.line,
              column: origEnd.column
            },
            source: origStart.source,
            name: origStart.name
          };
        }
      });
    } catch (e) {
      // FIXME: Look into why this fails on some of the assetgraph-builder tests:
      if (!/^Line must be greater than/.test(e.message)) {
        throw e;
      }
    }
  }

  set sourceMap(sourceMap) {
    this._sourceMap = sourceMap;
    if (typeof this._parseTree !== 'undefined') {
      this._applySourceMapToParseTree();
    }
  }

  _patchUpSerializedText(text, parseTree) {
    if (text.length > 0) {
      if (this.isInline) {
        // Make sure that '</script>' does not occur inside the script
        text = text.replace(/<\/(?=(\s*)script[/ >])/gi, '<\\/');

        // Trim trailing whitespace that might occur due to
        // escodegen.generate(ast, {format: { newline: '\n' } });
        text = text.replace(/\s+$/, '');
      } else {
        const lastStatement =
          parseTree.body.length && parseTree.body[parseTree.body.length - 1];
        if (
          lastStatement.trailingComments &&
          lastStatement.trailingComments.length > 0
        ) {
          text = text.replace(/\n?$/, '\n'); // End with a newline if the asset ends with a comment
        } else {
          text = text.replace(/;*$/, ';'); // Always end with a semicolon like the UglifyJS binary (if non-empty)
        }
      }
    }
    return text;
  }

  get textAndSourceMap() {
    if (typeof this._text === 'string') {
      return {
        text: this._text,
        sourceMap: this.sourceMap
      };
    } else if (
      typeof this._parseTree !== 'undefined' &&
      typeof this._sourceMap !== 'undefined'
    ) {
      return {
        text: this.text,
        sourceMap: this.sourceMap
      };
    } else {
      const parseTree = this._parseTree;
      const result = escodegen.generate(
        parseTree,
        _.defaults(
          { sourceMap: true, sourceMapWithCode: true },
          this._getEscodegenOptions()
        )
      );
      this._text = this._patchUpSerializedText(result.code, parseTree);
      this._sourceMap = result.map.toJSON();
      return {
        text: this._text,
        sourceMap: this.sourceMap
      };
    }
  }

  get parseTree() {
    if (!this._parseTree) {
      const text = this.text;
      const nonInlineAncestor = this.nonInlineAncestor;
      const sourceUrl =
        this.sourceUrl ||
        (nonInlineAncestor && nonInlineAncestor.url) ||
        this.url ||
        `standalone-${this.id}.js`;
      const esprimaOptions = {
        // Don't incur the penalty of tracking source locations if source maps are disabled globally:
        loc: !this.assetGraph || this.assetGraph.sourceMaps !== false,
        attachComment: true,
        source: sourceUrl,
        sourceType: 'module',
        jsx: true
      };
      try {
        this._parseTree = esprima.parse(text, esprimaOptions);
        if (this._sourceMap) {
          this._applySourceMapToParseTree();
        }
      } catch (errorParsingAsModule) {
        esprimaOptions.sourceType = 'script';
        let parsedAsScript = false;
        try {
          this._parseTree = esprima.parse(text, esprimaOptions);
          parsedAsScript = true;
          if (this._sourceMap) {
            this._applySourceMapToParseTree();
          }
        } catch (errorParsingAsScript) {
          const err = new errors.ParseError({
            message: `Parse error in ${this.urlOrDescription}\n${
              errorParsingAsScript.message
            } (line ${errorParsingAsScript.lineNumber})`,
            line: errorParsingAsScript.lineNumber,
            index: errorParsingAsScript.index,
            asset: this
          });
          if (this.assetGraph) {
            this.assetGraph.warn(err);
          } else {
            throw err;
          }
          this._parseTree = esprima.parse('', { loc: true, source: sourceUrl });
        }
        if (this.assetGraph && parsedAsScript) {
          this.assetGraph.info(
            new errors.ParseError(
              `Could not parse ${
                this.urlOrDescription
              } as a module, fall back to script mode\n${
                errorParsingAsModule.message
              }`
            )
          );
        }
      }
    }
    return this._parseTree;
  }

  set parseTree(parseTree) {
    this.unload();
    this._parseTree = parseTree;
    this._sourceMap = undefined;
    this._lastKnownByteLength = undefined;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  get isEmpty() {
    return this.parseTree.body.length === 0;
  }

  _cloneParseTree() {
    return espurify.customize({
      extra: [
        'loc',
        'range',
        'source_type',
        'comments',
        'raw',
        'trailingComments',
        'leadingComments'
      ]
    })(this._parseTree);
  }

  minify() {
    this.isPretty = false;
    this._toBeMinified = true;
    const parseTree = this.parseTree; // Important side effect: The markDirty call below will remove this._text

    function filterCommentAttribute(node, attributeName) {
      if (node[attributeName]) {
        const leftoverComments = node[attributeName].filter(
          JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput
        );
        if (leftoverComments.length > 0) {
          node[attributeName] = leftoverComments;
        } else {
          node[attributeName] = undefined;
        }
      }
    }

    estraverse.traverse(parseTree, {
      enter(node) {
        filterCommentAttribute(node, 'leadingComments');
        filterCommentAttribute(node, 'trailingComments');
      }
    });

    this.markDirty();
    return this;
  }

  prettyPrint() {
    this.isPretty = true;
    this._toBeMinified = false;
    this.markDirty();
    return this;
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }

    const syntaxErrors = [];
    const warnings = [];
    const infos = [];

    const that = this;
    const parseTree = this.parseTree;
    const processedComments = [];

    estraverse.traverse(parseTree, {
      enter(node, parentNode) {
        for (const propertyName of ['leadingComments', 'trailingComments']) {
          for (const comment of node[propertyName] || []) {
            if (!processedComments.includes(comment)) {
              processedComments.push(comment);
              const matchSourceUrlOrSourceMappingUrl = comment.value.match(
                /[@#]\s*source(Mapping)?URL=([^\s\n]*)/
              );
              if (matchSourceUrlOrSourceMappingUrl) {
                if (matchSourceUrlOrSourceMappingUrl[1] === 'Mapping') {
                  outgoingRelations.push({
                    type: 'JavaScriptSourceMappingUrl',
                    node: comment,
                    parentNode: node,
                    commentPropertyName: propertyName,
                    to: {
                      url: matchSourceUrlOrSourceMappingUrl[2],
                      // Source maps are currently served as application/json, so prevent the target asset
                      // from being loaded as a Json asset:
                      type: 'SourceMap'
                    }
                  });
                } else {
                  outgoingRelations.push({
                    type: 'JavaScriptSourceUrl',
                    node: comment,
                    parentNode: node,
                    commentPropertyName: propertyName,
                    href: matchSourceUrlOrSourceMappingUrl[2]
                  });
                }
              } else {
                const matchSystemJsBundle = comment.value.match(
                  /#\s*SystemJsBundle=([^\s\n]*)/
                );
                if (matchSystemJsBundle) {
                  outgoingRelations.push({
                    type: 'SystemJsBundle',
                    node: comment,
                    parentNode: node,
                    commentPropertyName: propertyName,
                    href: matchSystemJsBundle[1]
                  });
                }
              }
            }
          }
        }

        const stack = this.parents();
        stack.push(node);

        // Detect global 'use strict' directives
        if (
          parentNode === that.parseTree &&
          node.type === 'ExpressionStatement' &&
          node.expression.type === 'Literal' &&
          node.expression.value === 'use strict'
        ) {
          that.strict = true;
        }

        if (node.type === 'CallExpression') {
          const parentParentNode = stack[stack.length - 3];

          if (
            node.callee.type === 'MemberExpression' &&
            !node.callee.computed &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'toString' &&
            node.callee.object.type === 'Literal' &&
            typeof node.callee.object.value === 'string' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'Literal' &&
            node.arguments[0].value === 'url'
          ) {
            outgoingRelations.push({
              type: 'JavaScriptStaticUrl',
              node,
              argumentNode: node.callee.object,
              parentNode,
              href: node.callee.object.value
            });
          } else if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'MemberExpression' &&
            node.callee.object.object.name === 'navigator' &&
            node.callee.object.property.name === 'serviceWorker' &&
            node.callee.property.name === 'register' &&
            typeof node.arguments[0].value === 'string'
          ) {
            // Service worker registration
            // navigator.serviceWorker.register('sw.js')

            // Scope detection
            // if (node.arguments[1] &&
            //     node.arguments[1].type === 'ObjectExpression'
            //     ) {
            //     const scope = that.assetGraph.root;

            //     node.arguments[1].properties.some(function (property) {
            //         if (property.key.name === 'scope') {
            //             scope = property.value.value;
            //             return true;
            //         }
            //     });
            // }

            outgoingRelations.push({
              type: 'JavaScriptServiceWorkerRegistration',
              href: node.arguments[0].value,
              node
            });
          }

          // JavaScript Fetch
          if (
            ((!that.assetGraph || !that.assetGraph.disableFetch) &&
              // fetch('foo')
              (node.callee.type === 'Identifier' &&
                node.callee.name === 'fetch')) ||
            // window.fetch('foo')
            (node.callee.type === 'MemberExpression' &&
              !node.callee.computed &&
              node.callee.property.type === 'Identifier' &&
              node.callee.property.name === 'fetch' &&
              node.callee.object.type === 'Identifier' &&
              node.callee.object.name === 'window')
          ) {
            // First argument must be a string literal
            if (
              node.arguments[0] &&
              node.arguments[0].type === 'Literal' &&
              typeof node.arguments[0].value === 'string'
            ) {
              outgoingRelations.push({
                type: 'JavaScriptFetch',
                detachableNode:
                  parentNode.type === 'SequenceExpression' ? node : parentNode,
                parentNode:
                  parentNode.type === 'SequenceExpression'
                    ? parentNode
                    : parentParentNode,
                node: node.arguments[0],
                href: node.arguments[0].value
              });
            }
          } else if (
            (node.callee.type === 'Identifier' &&
              node.callee.name === 'importScripts') ||
            (node.callee.type === 'MemberExpression' &&
              !node.callee.computed &&
              node.callee.property.type === 'Identifier' &&
              node.callee.property.name === 'importScripts' &&
              node.callee.object.type === 'Identifier' &&
              node.callee.object.name === 'self')
          ) {
            for (const argumentNode of node.arguments) {
              if (
                argumentNode.type === 'Literal' &&
                typeof argumentNode.value === 'string'
              ) {
                outgoingRelations.push({
                  type: 'JavaScriptImportScripts',
                  detachableNode:
                    parentNode.type === 'SequenceExpression'
                      ? node
                      : parentNode,
                  parentNode:
                    parentNode.type === 'SequenceExpression'
                      ? parentNode
                      : parentParentNode,
                  argumentsNode: node.arguments,
                  node: argumentNode,
                  href: argumentNode.value
                });
              }
            }
          }
        } else if (
          node.type === 'NewExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Worker' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          outgoingRelations.push({
            type: 'JavaScriptWebWorker',
            node,
            href: node.arguments[0].value
          });
        } else if (node.type === 'ImportDeclaration') {
          outgoingRelations.push({
            type: 'JavaScriptImport',
            node,
            href: node.source.value
          });
        } else if (
          (node.type === 'ExportNamedDeclaration' ||
            node.type === 'ExportAllDeclaration') &&
          node.source
        ) {
          outgoingRelations.push({
            type: 'JavaScriptExport',
            node,
            href: node.source.value
          });
        }
      }
    });
    if (syntaxErrors.length > 0) {
      if (this.assetGraph) {
        for (const syntaxError of syntaxErrors) {
          syntaxError.asset = this;
          this.assetGraph.warn(syntaxError);
        }
      } else {
        throw syntaxErrors[0];
      }
    }
    for (const warning of warnings) {
      if (this.assetGraph) {
        warning.asset = this;
        this.assetGraph.warn(warning);
      } else {
        console.warn(warning.message);
      }
    }
    for (const info of infos) {
      if (this.assetGraph) {
        info.asset = this;
        this.assetGraph.info(info);
      } else {
        console.info(info.message);
      }
    }
    return outgoingRelations;
  }
}

Object.assign(JavaScript.prototype, {
  contentType: 'application/javascript',

  supportedExtensions: ['.js']
});

JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput = comment => {
  return /@jsx|@preserve|@license|@cc_on|#\s*SystemJsBundle|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/.test(
    comment.value
  );
};

module.exports = JavaScript;

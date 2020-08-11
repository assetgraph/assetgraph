const escodegen = require('escodegen');
const estraverse = require('estraverse-fb');
const esquery = require('esquery');
const espurify = require('espurify');
const mozilla = require('source-map');
const repeatString = require('repeat-string');
const errors = require('../errors');
const Text = require('./Text');
const parseJavaScript = require('../parseJavaScript');

class JavaScript extends Text {
  init(config) {
    super.init(config);
    this.serializationOptions = this.serializationOptions || {};
  }

  _getEscodegenOptions() {
    const outputOptions = {
      ...this.serializationOptions,
      ...(this.assetGraph && this.assetGraph.javaScriptSerializationOptions),
    };

    return {
      format: {
        quotes: 'auto',
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
              : '',
        },
      },
      comment: true,
      attachComment: true,
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
      this._sourceMap = escodegen.generate(this.parseTree, {
        ...this._getEscodegenOptions(),
        sourceMap: true,
      });
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
              column: origStart.column,
            },
            end: origEnd.line && {
              line: origEnd.line,
              column: origEnd.column,
            },
            source: origStart.source,
            name: origStart.name,
          };
        },
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
        sourceMap: this.sourceMap,
      };
    } else if (
      typeof this._parseTree !== 'undefined' &&
      typeof this._sourceMap !== 'undefined'
    ) {
      return {
        text: this.text,
        sourceMap: this.sourceMap,
      };
    } else {
      const parseTree = this._parseTree;
      const result = escodegen.generate(parseTree, {
        ...this._getEscodegenOptions(),
        sourceMap: true,
        sourceMapWithCode: true,
      });
      this._text = this._patchUpSerializedText(result.code, parseTree);
      this._sourceMap = result.map.toJSON();
      return {
        text: this._text,
        sourceMap: this.sourceMap,
      };
    }
  }

  _parse(text, sourceType = 'module') {
    const nonInlineAncestor = this.nonInlineAncestor;
    const sourceFile =
      this.sourceUrl ||
      (nonInlineAncestor && nonInlineAncestor.url) ||
      this.url ||
      `standalone-${this.id}.js`;
    this._parseTree = parseJavaScript(text, {
      locations: true,
      tokens: true,
      ranges: true,
      ecmaVersion: 11,
      sourceFile,
      sourceType,
    });

    if (this._sourceMap) {
      this._applySourceMapToParseTree();
    }
  }

  get parseTree() {
    if (!this._parseTree) {
      const text = this.text;
      try {
        this._parse(text);
      } catch (errorParsingAsModule) {
        let parsedAsScript = false;
        try {
          this._parse(text, 'script');
          parsedAsScript = true;
        } catch (errorParsingAsScript) {
          const message = `Parse error in ${this.urlOrDescription}\n${errorParsingAsScript.message}`;
          const err = new errors.ParseError({
            message,
            line: errorParsingAsScript.lineNumber,
            index: errorParsingAsScript.index,
            asset: this,
          });
          if (this.assetGraph) {
            this.assetGraph.warn(err);
          } else {
            throw err;
          }
          this._parse('');
        }
        if (this.assetGraph && parsedAsScript) {
          this.assetGraph.info(
            new errors.ParseError(
              `Could not parse ${this.urlOrDescription} as a module, fall back to script mode\n${errorParsingAsModule.message}`
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

  // Whether the asset has a global "use strict"; statement
  // Useful for wrapping the asset in an IIFE when concatenating in order to avoid leakage
  get isStrict() {
    return this.parseTree.body.some(
      (node) =>
        node.type === 'ExpressionStatement' &&
        node.expression.type === 'Literal' &&
        node.expression.value === 'use strict'
    );
  }

  // Deprecated
  // FIXME: Remove in next major version
  get strict() {
    return this.isStrict;
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
        'leadingComments',
      ],
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
      },
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

    const parsedSelectors = [];
    for (const Relation of JavaScript.relations) {
      const selector = Relation.selector;
      if (selector) {
        parsedSelectors.push({
          parsedSelector: esquery.parse(selector),
          Relation,
          handler: Relation.handler,
        });
      }
    }

    const parseTree = this.parseTree;
    const stack = [];
    estraverse.traverse(parseTree, {
      enter: (node, parent) => {
        if (parent) {
          // This is a bit inefficient, but esquery requires the first parent to be the first element:
          stack.unshift(parent);
        }
        for (const { parsedSelector, handler, Relation } of parsedSelectors) {
          if (esquery.matches(node, parsedSelector, stack)) {
            let relations = handler(node, stack, this);
            if (relations) {
              if (!Array.isArray(relations)) {
                relations = [relations];
              }
              for (const relation of relations) {
                relation.type = relation.type || Relation.name;
              }
              outgoingRelations.push(...relations);
            }
          }
        }
      },
      leave() {
        stack.shift();
      },
    });
    return outgoingRelations;
  }
}

Object.assign(JavaScript.prototype, {
  contentType: 'application/javascript',

  supportedExtensions: ['.js'],
});

JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput = (comment) => {
  return /@jsx|@preserve|@license|@cc_on|#\s*SystemJsBundle|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/.test(
    comment.value
  );
};

module.exports = JavaScript;

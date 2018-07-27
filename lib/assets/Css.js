// FIXME
global.Promise = require('bluebird');

const AssetGraph = require('../AssetGraph');
const postcss = require('postcss');
const perfectionist = require('perfectionist');
const errors = require('../errors');
const Text = require('./Text');
const propertyWithImageUrlRegExp = /^(?:content|_?cursor|_?background(?:-image)?|(?:-[a-z]+-)?(?:border-image(?:-source)?|mask|mask-image|mask-image-source|mask-box-image|mask-box-image-source)|(?:\+|-webkit-)?filter)$/i;
const cssnano = require('cssnano');

function extractEncodingFromText(text) {
  const matchCharset = text.match(/@charset\s*(['"])\s*([\w-]+)\s*\1/im);
  return matchCharset && matchCharset[2]; // Will be undefined in case of no match
}

class Css extends Text {
  get encoding() {
    if (!this._encoding) {
      if (typeof this._text === 'string') {
        this._encoding =
          extractEncodingFromText(this._text) || this.defaultEncoding;
      } else if (this._rawSrc) {
        this._encoding =
          extractEncodingFromText(
            this._rawSrc.toString(
              'binary',
              0,
              Math.min(1024, this._rawSrc.length)
            )
          ) || this.defaultEncoding;
      } else {
        this._encoding = this.defaultEncoding;
      }
    }
    return this._encoding;
  }

  set encoding(encoding) {
    if (encoding !== this.encoding) {
      /*eslint-disable*/
      const text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
      /*eslint-enable*/
      this._rawSrc = undefined;
      this._encoding = encoding;
      this.markDirty();
    }
  }

  _updateText(forceUpdateSourceMap) {
    const sourceMapsEnabled =
      !this.assetGraph || this.assetGraph.sourceMaps !== false;
    if (!this._parseTree && this._rawSrc) {
      this._text = this._getTextFromRawSrc();
      if (!forceUpdateSourceMap || typeof this._sourceMap !== 'undefined') {
        return;
      }
    }
    if (this._parseTree) {
      let result;
      if (this.isPretty) {
        result = postcss(perfectionist).process(this.parseTree, {
          map: sourceMapsEnabled && {
            inline: false,
            annotation: false,
            sourcesContent: true
          }
        });
      } else {
        result = this.parseTree.toResult({
          map: sourceMapsEnabled && {
            inline: false,
            annotation: false,
            sourcesContent: true
          }
        });
      }
      this._text = result.root.toString();
      if (result.map) {
        this._sourceMap = result.map.toJSON();
      }
    }
  }

  get text() {
    if (typeof this._text !== 'string') {
      this._updateText();
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  get sourceMap() {
    if (typeof this._sourceMap === 'undefined') {
      this._updateText(true);
    }
    if (typeof this._sourceMap === 'string') {
      this._sourceMap = JSON.parse(this._sourceMap);
    }
    return this._sourceMap;
  }

  get parseTree() {
    if (!this._parseTree) {
      // Emulate postcss' PreviousMap class, but take the source from memory:
      // CSSOM gets the @charset declaration mixed up with the first selector:
      const nonInlineAncestor = this.nonInlineAncestor;
      const sourceUrl =
        this.sourceUrl ||
        (nonInlineAncestor && nonInlineAncestor.url) ||
        this.url ||
        `standalone-${this.id}.css`;
      try {
        this._parseTree = postcss.parse(this.text, {
          source: sourceUrl,
          from: sourceUrl,
          map: this._sourceMap && { prev: this._sourceMap }
        });
        this._parseTree.source.input.file = sourceUrl;
        if (this._parseTree.source.input.map) {
          this._parseTree.source.input.map.file = sourceUrl;
        }
      } catch (e) {
        // TODO: Consider using https://github.com/postcss/postcss-safe-parser
        const err = new errors.ParseError({
          message: `Parse error in ${this.urlOrDescription}(line ${
            e.line
          }, column ${e.column}):\n${e.message}${
            e.styleSheet
              ? `\nFalling back to using the ${
                  e.styleSheet.cssRules.length
                } parsed CSS rules`
              : ''
          }`,
          styleSheet: e.styleSheet,
          line: e.line,
          column: e.column,
          asset: this
        });
        if (this.assetGraph) {
          this._parseTree = postcss.parse(''); // Hmm, FIXME
          this.assetGraph.warn(err);
        } else {
          throw err;
        }
      }
    }
    return this._parseTree;
  }

  set parseTree(parseTree) {
    this.unload();
    this._parseTree = parseTree;
    this._lastKnownByteLength = undefined;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  _cloneParseTree() {
    // Waiting for https://github.com/postcss/postcss/issues/364
    function cloneWithRaws(node) {
      if (node.nodes) {
        const oldNodes = node.nodes;
        node.nodes = [];
        const clone = node.clone({ raws: node.raws });
        node.nodes = oldNodes;
        for (const clonedChild of oldNodes.map(cloneWithRaws)) {
          clone.append(clonedChild);
        }
        return clone;
      } else {
        return node.clone({ raws: node.raws });
      }
    }

    return cloneWithRaws(this._parseTree);
  }

  set sourceMap(sourceMap) {
    this._sourceMap = sourceMap;
    if (typeof this._parseTree !== 'undefined') {
      Object.assign(
        this._parseTree.source.input,
        postcss.parse('', { map: { prev: sourceMap } }).source.input
      );
    }
  }

  get isEmpty() {
    return this.parseTree.nodes.length === 0;
  }

  prettyPrint() {
    this.isPretty = true;
    /*eslint-disable*/
    const parseTree = this.parseTree; // So markDirty removes this._text
    /*eslint-enable*/
    this.markDirty();
    return this;
  }

  async minify() {
    try {
      const result = await cssnano.process(
        this.parseTree,
        { from: undefined, map: { annotation: false } }, // Tell postcss to not remove the sourceMappingURL comment
        {
          preset: [
            'default',
            {
              svgo: false,
              discardComments: {
                remove(comment) {
                  return !/@preserve|@license|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/.test(
                    comment
                  );
                }
              }
            }
          ]
        }
      );
      this.parseTree = result.root;
    } catch (err) {
      this.assetGraph.warn(err);
    }
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    this.eachRuleInParseTree((node, parentRuleOrStylesheet) => {
      if (node.type === 'comment') {
        const matchSourceUrlOrSourceMappingUrl = node.text.match(
          /[@#]\s*source(Mapping)?URL=([^\s\n]*)/
        );
        if (matchSourceUrlOrSourceMappingUrl) {
          if (matchSourceUrlOrSourceMappingUrl[1] === 'Mapping') {
            outgoingRelations.push({
              type: 'CssSourceMappingUrl',
              node,
              to: {
                url: matchSourceUrlOrSourceMappingUrl[2],
                // Source maps are currently served as application/json, so prevent the target asset
                // from being loaded as a Json asset:
                type: 'SourceMap'
              }
            });
          } else {
            outgoingRelations.push({
              type: 'CssSourceUrl',
              node,
              href: matchSourceUrlOrSourceMappingUrl[2]
            });
          }
        }
      } else if (
        node.type === 'atrule' &&
        node.name.toLowerCase() === 'import'
      ) {
        outgoingRelations.push({
          type: 'CssImport',
          href: AssetGraph.CssImport.parse(node.params).url,
          parentNode: parentRuleOrStylesheet,
          node
        });
      } else if (
        node.type === 'atrule' &&
        node.name.toLowerCase() === 'font-face'
      ) {
        for (const childNode of node.nodes) {
          if (
            childNode.type === 'decl' &&
            childNode.prop.toLowerCase() === 'src'
          ) {
            for (const [
              tokenNumber,
              href
            ] of AssetGraph.CssFontFaceSrc.prototype
              .findUrlsInPropertyValue(childNode.value)
              .entries()) {
              const tokenString = childNode.value.split(href)[1];
              const match = tokenString.match(
                /['"]?\) *format\(['"]?([^)'"]+)['"]?\)/i
              );
              const format = match && match[1];

              outgoingRelations.push({
                type: 'CssFontFaceSrc',
                href,
                tokenNumber,
                parentNode: parentRuleOrStylesheet,
                node,
                propertyNode: childNode,
                format // This should probably be chaned to a getter/setter on CssFontFaceSrc in the future
              });
            }
          }
        }
      } else if (node.type === 'rule') {
        for (const childNode of node.nodes) {
          if (!childNode.prop) {
            continue;
          }
          const propertyName = childNode.prop.toLowerCase();
          const propertyValue = childNode.value;
          if (propertyWithImageUrlRegExp.test(propertyName)) {
            for (const [
              tokenNumber,
              href
            ] of AssetGraph.CssImage.prototype
              .findUrlsInPropertyValue(propertyValue)
              .entries()) {
              if (!/^#/.test(href)) {
                // Don't model eg. filter: url(#foo);
                outgoingRelations.push({
                  type: 'CssImage',
                  href,
                  tokenNumber,
                  parentNode: parentRuleOrStylesheet,
                  node,
                  propertyNode: childNode
                });
              }
            }
          } else if (propertyName === 'behavior') {
            // Skip behavior properties that have # as the first char in the url so that
            // stuff like behavior(#default#VML) won't be treated as a relation.
            const matchUrl = propertyValue.match(
              /\burl\(('|"|)([^#'"][^'"]*?)\1\)/
            );
            if (matchUrl) {
              outgoingRelations.push({
                type: 'CssBehavior',
                href: matchUrl[2],
                parentNode: parentRuleOrStylesheet,
                node,
                propertyNode: childNode
              });
            }
          }

          if (propertyName === 'filter' || propertyName === '-ms-filter') {
            for (const [
              tokenNumber,
              href
            ] of AssetGraph.CssAlphaImageLoader.prototype
              .findUrlsInPropertyValue(propertyValue)
              .entries()) {
              outgoingRelations.push({
                type: 'CssAlphaImageLoader',
                href,
                tokenNumber,
                parentNode: parentRuleOrStylesheet,
                node,
                propertyNode: childNode
              });
            }
          }
        }
      }
    });
    return outgoingRelations;
  }

  eachRuleInParseTree(lambda) {
    Css.eachRuleInParseTree(this.parseTree, lambda);
  }
}

Object.assign(Css.prototype, {
  contentType: 'text/css',

  supportedExtensions: ['.css']
});

// If lambda returns false, subrules won't be traversed
Css.eachRuleInParseTree = (ruleOrStylesheet, lambda) => {
  for (const node of ruleOrStylesheet.nodes) {
    if (lambda(node, ruleOrStylesheet) !== false && node.nodes) {
      Css.eachRuleInParseTree(node, lambda);
    }
  }
};

// Waiting for https://github.com/postcss/postcss/issues/364
Css.cloneWithRaws = original => {
  const clone = original.clone();
  (function reattachRaws(clone, original) {
    if (original.raws) {
      clone.raws = Object.assign({}, original.raws);
    }
    if (clone.nodes && original.nodes) {
      for (
        let i = 0;
        i < original.nodes.length && i < clone.nodes.length;
        i += 1
      ) {
        reattachRaws(clone.nodes[i], original.nodes[i]);
      }
    }
  })(clone, original);
  return clone;
};

// Overwrite some methods in the copy of require('source-map').SourceMapGenerator
// that postcss gets to compensate for its mangling of urls. This should be
// fixed in postcss itself instead:

function fixPostcssUrl(url) {
  return url.replace(/^http:\/+/, 'http://').replace(/^file:\/*/, 'file:///');
}

let postcssSourceMap;
try {
  postcssSourceMap = require('postcss/node_modules/source-map');
} catch (e) {
  postcssSourceMap = require('source-map');
}

const originalAddMapping =
  postcssSourceMap.SourceMapGenerator.prototype.addMapping;
postcssSourceMap.SourceMapGenerator.prototype.addMapping = function(mapping) {
  if (mapping.source) {
    mapping.source = fixPostcssUrl(mapping.source);
  }
  return originalAddMapping.apply(this, arguments);
};

const originalApplySourceMap =
  postcssSourceMap.SourceMapGenerator.prototype.applySourceMap;
postcssSourceMap.SourceMapGenerator.prototype.applySourceMap = function(
  sourceMapConsumer,
  sourceFile,
  sourceMapPath
) {
  if (sourceFile) {
    sourceFile = fixPostcssUrl(sourceFile);
  }
  if (sourceMapPath) {
    sourceMapPath = fixPostcssUrl(sourceMapPath);
  }
  return originalApplySourceMap.call(
    this,
    sourceMapConsumer,
    sourceFile,
    sourceMapPath
  );
};

module.exports = Css;

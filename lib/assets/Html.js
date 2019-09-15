/* eslint no-redeclare: "off", block-scoped-var: "off" */
const _ = require('lodash');
const { JSDOM, VirtualConsole } = require('jsdom');
const virtualConsole = new VirtualConsole();
const domspace = require('domspace');
const htmlMinifier = require('html-minifier');
const errors = require('../errors');
const Text = require('./Text');
const mozilla = require('source-map');

function extractEncodingFromText(text) {
  let metaCharset;
  for (const metaTagString of text.match(/<meta[^>]+>/gi) || []) {
    if (/\bhttp-equiv=(["']|)\s*Content-Type\s*\1/i.test(metaTagString)) {
      const matchContent = metaTagString.match(
        /\bcontent=(["']|)\s*text\/html;\s*charset=([\w-]*)\s*\1/i
      );
      if (matchContent) {
        metaCharset = matchContent[2];
      }
    } else {
      const matchSimpleCharset = metaTagString.match(
        /\bcharset=(["']|)\s*([\w-]*)\s*\1/i
      );
      if (matchSimpleCharset) {
        metaCharset = matchSimpleCharset[2];
      }
    }
  }
  return metaCharset; // Will be undefined if not found
}

class Html extends Text {
  init(config = {}) {
    super.init(config);
    if (typeof config.isFragment !== 'undefined') {
      this._isFragment = config.isFragment;
      config.isFragment = undefined;
    }
  }

  get encoding() {
    if (!this._encoding) {
      // An explicit encoding (Content-Type header, data: url charset, assetConfig) takes precedence, but if absent we should
      // look for a <meta http-equiv='Content-Type' ...> tag with a charset before falling back to the defaultEncoding (utf-8)
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
    // An intended side effect of getting this.parseTree before deleting this._rawSrc is that we're sure
    // that the raw source has been decoded into this._text before the original encoding is thrown away.
    const parseTree = this.parseTree;
    if (parseTree.head) {
      const existingMetaElements = parseTree.head.getElementsByTagName('meta');
      let contentTypeMetaElement;

      for (const metaElement of existingMetaElements) {
        if (
          metaElement.hasAttribute('charset') ||
          /^content-type$/i.test(metaElement.getAttribute('http-equiv'))
        ) {
          contentTypeMetaElement = metaElement;
          break;
        }
      }

      if (!contentTypeMetaElement) {
        contentTypeMetaElement = parseTree.createElement('meta');
        parseTree.head.insertBefore(
          contentTypeMetaElement,
          parseTree.head.firstChild
        );
        this.markDirty();
      }
      if (contentTypeMetaElement.hasAttribute('http-equiv')) {
        if (
          (
            contentTypeMetaElement.getAttribute('content') || ''
          ).toLowerCase() !== `text/html; charset=${encoding}`
        ) {
          contentTypeMetaElement.setAttribute(
            'content',
            `text/html; charset=${encoding}`
          );
          this.markDirty();
        }
      } else {
        // Simple <meta charset="...">
        if (contentTypeMetaElement.getAttribute('charset') !== encoding) {
          contentTypeMetaElement.setAttribute('charset', encoding);
          this.markDirty();
        }
      }
    }
    if (encoding !== this.encoding) {
      this._encoding = encoding;
      this.markDirty();
    }
  }

  unload() {
    super.unload();
    this._templateReplacements = {};
    if (this._jsdom) {
      this._jsdom.window.close();
      this._jsdom = undefined;
    }
  }

  get text() {
    if (typeof this._text !== 'string') {
      if (this._parseTree) {
        this._text = this.isFragment
          ? this._parseTree.innerHTML
          : this._jsdom.serialize();
        const templateReplacements = this._templateReplacements;
        this._text = Object.keys(templateReplacements).reduce(
          (text, key) => text.replace(key, templateReplacements[key]),
          this._text
        );
      } else {
        this._text = this._getTextFromRawSrc();
      }
      if (this._toBeMinified) {
        this._text = htmlMinifier.minify(
          this._text,
          _.defaults(this.htmlMinifierOptions || {}, {
            // https://github.com/kangax/html-minifier#options-quick-reference
            maxLineLength: Infinity,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeEmptyAttributes: true,
            removeAttributeQuotes: true,
            // useShortDoctype: true, // Replaces any DOCTYPE with the HTML5 one.
            // removeOptionalTags: true, // Omits </head>, </body>, </html> etc. Too obtrusive?
            removeComments: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            ignoreCustomComments: [
              /^\s*\/?(?:ko|hz)(?:\s|$)/,
              /^ASSETGRAPH DOCUMENT (?:START|END) MARKER$|^#|^\[if|^<!\[endif\]|^esi/
            ]
          })
        );
      }
    }
    return this._text;
  }

  set text(text) {
    this.unload();

    this._text = text;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  get parseTree() {
    if (!this._parseTree) {
      let text;
      if (typeof this._text === 'string') {
        text = this._text;
      } else {
        text = this._getTextFromRawSrc();
      }
      const templateReplacements = (this._templateReplacements = {});
      text = text.replace(/<([%?])[^\1]*?\1>/g, (match, sub1, offset) => {
        const key = `⋖${offset}⋗`;
        templateReplacements[key] = match;
        return key;
      });

      const isFragment = this.isFragment;
      let document;
      try {
        const jsdom = new JSDOM(isFragment ? `<body>${text}</body>` : text, {
          virtualConsole,
          includeNodeLocations: true,
          runScripts: 'outside-only'
        });
        document = jsdom.window.document;
        this._jsdom = jsdom;
      } catch (e) {
        const err = new errors.ParseError({
          message: `Parse error in ${this.urlOrDescription}\n${e.message}`,
          asset: this
        });
        if (this.assetGraph) {
          this.assetGraph.warn(err);
        } else {
          throw err;
        }
      }
      if (isFragment) {
        // Install the properties of document on the HtmlBodyElement used as the parse tree:
        for (const propertyName in document) {
          if (!(propertyName in document.body) && propertyName !== 'head') {
            if (typeof document[propertyName] === 'function') {
              document.body[propertyName] = document[propertyName].bind(
                document
              );
            } else {
              document.body[propertyName] = document[propertyName];
            }
          }
        }
        this._parseTree = document.body;
      } else {
        this._parseTree = document;
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

  get isFragment() {
    if (typeof this._isFragment === 'undefined' && this.isLoaded) {
      if (this._parseTree) {
        const document = this.parseTree;
        this._isFragment =
          !document.doctype &&
          !document.body &&
          document.getElementsByTagName('head').length === 0;
      } else {
        this._isFragment = !/<!doctype|<html|<head|<body/i.test(this.text);
      }
    }
    return this._isFragment;
  }

  set isFragment(isFragment) {
    this._isFragment = isFragment;
  }

  _createSourceMapForInlineScriptOrStylesheet(element) {
    const nonInlineAncestor = this.nonInlineAncestor;
    const sourceUrl =
      this.sourceUrl || (nonInlineAncestor ? nonInlineAncestor.url : this.url);
    let location;
    if (element.firstChild) {
      location = this._jsdom.nodeLocation(element.firstChild);
    } else {
      // Empty script or stylesheet
      location = this._jsdom.nodeLocation(element).endTag;
    }
    const sourceMapGenerator = new mozilla.SourceMapGenerator({
      file: sourceUrl
    });
    const text = element.firstChild ? element.firstChild.nodeValue : '';
    let generatedLineNumber = 1;
    let generatedColumnNumber = 0;
    let previousChar;
    let originalLineNumber = location.startLine;
    let originalColumnNumber = location.startCol;
    let hasAddedMappingForTheCurrentLine = false;
    function addMapping() {
      sourceMapGenerator.addMapping({
        generated: {
          line: generatedLineNumber,
          column: generatedColumnNumber
        },
        original: {
          line: originalLineNumber,
          column: originalColumnNumber
        },
        source: sourceUrl
      });
    }
    addMapping();
    for (let i = 0; i < text.length; i += 1) {
      const ch = text.charAt(i);
      if (ch === '\n') {
        if (previousChar !== '\r') {
          originalLineNumber += 1;
          generatedLineNumber += 1;
          generatedColumnNumber = 0;
          originalColumnNumber = 0;
          hasAddedMappingForTheCurrentLine = false;
        }
      } else if (ch === '\r') {
        if (previousChar !== '\n') {
          originalLineNumber += 1;
          generatedLineNumber += 1;
          generatedColumnNumber = 0;
          originalColumnNumber = 0;
          hasAddedMappingForTheCurrentLine = false;
        }
      } else {
        if (!hasAddedMappingForTheCurrentLine && !/\s/.test(ch)) {
          addMapping();
        }
        originalColumnNumber += 1;
        generatedColumnNumber += 1;
      }
      previousChar = ch;
    }
    addMapping();
    return sourceMapGenerator.toJSON();
  }

  *_visitAllNodesInDom(node = this.parseTree) {
    const stopTraversal = yield node;
    if (!stopTraversal && node.childNodes) {
      for (const childNode of Array.from(node.childNodes)) {
        yield* this._visitAllNodesInDom(childNode);
      }
    }
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    const nodeGenerator = this._visitAllNodesInDom();
    let stopTraversal = false;
    while (true) {
      const { done, value: node } = nodeGenerator.next(stopTraversal);
      if (done) {
        break;
      }
      stopTraversal = false;
      for (const Relation of Html.relations) {
        if (Relation.getRelationsFromNode) {
          let relations = Relation.getRelationsFromNode(node, this);
          if (Relation.stopTraversal && Relation.stopTraversal(node, this)) {
            stopTraversal = true;
          }
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
    }
    return outgoingRelations;
  }

  allowsPerCsp(directive, urlOrToken, protectedResourceUrl) {
    const csps = [];
    for (const outgoingRelation of this.outgoingRelations) {
      if (
        outgoingRelation.type === 'HtmlContentSecurityPolicy' &&
        outgoingRelation.to &&
        outgoingRelation.to.type === 'ContentSecurityPolicy'
      ) {
        csps.push(outgoingRelation.to);
      }
    }
    return csps.every(csp =>
      csp.allows(directive, urlOrToken, protectedResourceUrl)
    );
  }

  minify() {
    this._toBeMinified = true;
    // eslint-disable-next-line no-unused-expressions
    this.parseTree; // Side effect: Make sure that reserialize when .text or .rawSrc are accessed
    this.markDirty();
    return this;
  }

  prettyPrint() {
    this._toBeMinified = false;
    domspace(this.parseTree);
    this.markDirty();
    return this;
  }
}

Object.assign(Html.prototype, {
  contentType: 'text/html',

  supportedExtensions: [
    '.html',
    '.template',
    '.xhtml',
    '.shtml',
    '.ko',
    '.ejs'
  ],

  isPretty: false
});

Html.relations = new Set();

module.exports = Html;

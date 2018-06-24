const _ = require('lodash');
const matchSourceExpression = require('../matchSourceExpression');
const Text = require('./Text');

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, ($0, ch) => ch.toUpperCase());
}

function fromCamelCase(str) {
  return str.replace(/[A-Z]/g, $0 => `-${$0.toLowerCase()}`);
}

function normalizeFragment(fragment) {
  if (
    /^'(?:unsafe-inline|unsafe-eval|unsafe-dynamic|unsafe-hash-attributes|self)'$/i.test(
      fragment
    )
  ) {
    return fragment.toLowerCase();
  }
  return fragment
    .replace(/^[a-z0-9.+-]+:/i, $0 => $0.toLowerCase())
    .replace(/^'sha(\d+)-/i, "'sha$1-")
    .replace(/^'nonce-/i, "'nonce-");
}

class ContentSecurityPolicy extends Text {
  get parseTree() {
    if (!this._parseTree) {
      const parseTree = {};
      const syntaxErrors = [];
      for (const directiveStr of this.text.split(/\s*;\s*/)) {
        if (!/^\s*$/.test(directiveStr)) {
          const fragments = directiveStr.replace(/^\s+|\s+$/g, '').split(/\s+/);
          const directiveName = toCamelCase(fragments.shift().toLowerCase());
          parseTree[directiveName] = fragments.map(normalizeFragment);
        }
      }
      if (syntaxErrors.length > 0) {
        if (this.assetGraph) {
          for (const syntaxError of syntaxErrors) {
            this.assetGraph.warn(syntaxError);
          }
        } else {
          throw new Error(_.map(syntaxErrors, 'message').join('\n'));
        }
      }
      this._parseTree = parseTree;
    }
    return this._parseTree;
  }

  set parseTree(parseTree) {
    this.unload();
    this._parseTree = parseTree;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  get text() {
    if (typeof this._text !== 'string') {
      if (this._parseTree) {
        this._text = '';
        for (const directiveName of Object.keys(this._parseTree)) {
          this._text += (this._text ? '; ' : '') + fromCamelCase(directiveName);
          if (this._parseTree[directiveName].length > 0) {
            this._text += ` ${this._parseTree[directiveName].join(' ')}`;
          }
        }
      } else {
        this._text = this._getTextFromRawSrc();
      }
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  lookupDirective(directive) {
    // Make sure the directive name is in camel case:
    directive = directive.replace(/-([a-z])/g, ($0, ch) => ch.toUpperCase());
    if (this.parseTree[directive]) {
      return this.parseTree[directive];
    } else if (
      ContentSecurityPolicy.directiveFallsBackToDefaultSrc(directive) &&
      this.parseTree.defaultSrc
    ) {
      return this.parseTree.defaultSrc;
    } else {
      return [];
    }
  }

  allows(directive, urlOrToken, protectedResourceUrl) {
    const sourceExpressions = this.lookupDirective(directive);
    if (sourceExpressions.length === 0) {
      return false;
    } else if (urlOrToken.charAt(0) === "'") {
      return sourceExpressions.includes(urlOrToken);
    } else {
      return sourceExpressions.some(sourceExpression =>
        matchSourceExpression(
          urlOrToken,
          sourceExpression,
          protectedResourceUrl || this.nonInlineAncestor.url
        )
      );
    }
  }
}

Object.assign(ContentSecurityPolicy.prototype, {
  contentType: null,

  supportedExtensions: []
});

const fallsBackToDefaultSrcByDirective = {};

for (const directive of [
  'connect-src',
  'font-src',
  'frame-src',
  'img-src',
  'manifest-src',
  'media-src',
  'object-src',
  'script-src',
  'style-src',
  'worker-src'
]) {
  fallsBackToDefaultSrcByDirective[
    directive
  ] = fallsBackToDefaultSrcByDirective[toCamelCase(directive)] = true;
}

ContentSecurityPolicy.directiveFallsBackToDefaultSrc = directive =>
  !!fallsBackToDefaultSrcByDirective[directive];

module.exports = ContentSecurityPolicy;

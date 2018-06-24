const errors = require('../errors');
const Json = require('./Json');
const mozilla = require('source-map');

class SourceMap extends Json {
  get parseTree() {
    if (!this._parseTree) {
      let obj;
      try {
        obj = JSON.parse(this.text.replace(/^\)\]\}/, '')); // Ignore leading )]} (allowed by the source map spec)
      } catch (e) {
        const err = new errors.ParseError({
          message: `Json parse error in ${this.url || '(inline)'}: ${
            e.message
          }`,
          asset: this
        });
        if (this.assetGraph) {
          this.assetGraph.warn(err);
        } else {
          throw err;
        }
      }
      if (obj) {
        this._parseTree = obj;
      }
    }
    return this._parseTree;
  }

  set parseTree(parseTree) {
    this.unload();
    this._parseTree = parseTree;
    this._lastKnownByteLength = undefined;
    this._consumer = undefined;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  get consumer() {
    if (!this._consumer) {
      this._consumer = new mozilla.SourceMapConsumer(this.parseTree);
    }
    return this._consumer;
  }

  get text() {
    return super.text;
  }

  set text(text) {
    this._consumer = undefined;
    super.text = text;
  }

  get rawSrc() {
    return super.rawSrc;
  }

  set rawSrc(rawSrc) {
    this._consumer = undefined;
    super.rawSrc = rawSrc;
  }

  generatedPositionFor(position) {
    return this.consumer.generatedPositionFor(position);
  }

  originalPositionFor(position) {
    return this.consumer.originalPositionFor(position);
  }

  markDirty() {
    super.markDirty();
    this._consumer = undefined;
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    const parseTree = this.parseTree;
    if (parseTree.file) {
      outgoingRelations.push({
        type: 'SourceMapFile',
        href: parseTree.file
      });
    }
    if (Array.isArray(parseTree.sources)) {
      for (const [index, href] of parseTree.sources.entries()) {
        // Skip bogus webpack entries:
        if (
          !/^\/webpack\/bootstrap [0-9a-f]+$|^\/\(webpack\)\/buildin\/module\.js$/.test(
            href
          )
        ) {
          outgoingRelations.push({
            type: 'SourceMapSource',
            index, // This isn't too robust
            href
          });
        }
      }
    }
    return outgoingRelations;
  }
}

Object.assign(SourceMap.prototype, {
  contentType: 'application/json',

  notDefaultForContentType: true, // Avoid reregistering application/json

  supportedExtensions: ['.map']
});

module.exports = SourceMap;

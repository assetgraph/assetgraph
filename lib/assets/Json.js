const errors = require('../errors');
const Text = require('./Text');

class Json extends Text {
  get parseTree() {
    if (!this._parseTree) {
      try {
        this._parseTree = JSON.parse(this.text);
      } catch (e) {
        const err = new errors.ParseError({
          message: `Json parse error in ${this.urlOrDescription}: ${e.message}`,
          asset: this
        });
        if (this.assetGraph) {
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

  get text() {
    if (typeof this._text !== 'string') {
      if (this._parseTree) {
        if (this.isPretty) {
          this._text = `${JSON.stringify(
            this._parseTree,
            undefined,
            '    '
          )}\n`;
        } else {
          this._text = JSON.stringify(this._parseTree);
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

  prettyPrint() {
    this.isPretty = true;
    /*eslint-disable*/
    const parseTree = this.parseTree; // So markDirty removes this._text
    /*eslint-enable*/
    this.markDirty();
    return this;
  }

  minify() {
    this.isPretty = false;
    /*eslint-disable*/
    const parseTree = this.parseTree; // So markDirty removes this._text
    /*eslint-enable*/
    this.markDirty();
    return this;
  }
}

Object.assign(Json.prototype, {
  contentType: 'application/json',

  supportedExtensions: ['.json', '.topojson'],

  isPretty: false
});

module.exports = Json;

const errors = require('../errors');
const Text = require('./Text');

class SrcSet extends Text {
  init(config) {
    super.init(config);
    if (!this._parseTree && typeof this._text !== 'string') {
      throw new Error('SrcSet: Either parseTree or text must be specified');
    }
  }

  get parseTree() {
    if (!this._parseTree) {
      this._parseTree = [];
      for (let entryStr of this.text.split(/,\s+/)) {
        entryStr = entryStr.replace(/^\s+|\s+$/g, '');
        const matchEntryStr = entryStr.match(/^([^\s]+)(.*)$/);
        if (matchEntryStr) {
          const extraTokens = matchEntryStr[2]
            .split(/\s+/)
            .filter(extraToken => !/^\s*$/.test(extraToken));
          this._parseTree.push({
            href: matchEntryStr[1],
            extraTokens
          });
        } else {
          const warning = new errors.SyntaxError({
            message: `SrcSet: Could not parse entry: ${entryStr}`,
            asset: this
          });
          if (this.assetGraph) {
            this.assetGraph.warn(warning);
          } else {
            console.warn(`${this.toString()}: ${warning.message}`);
          }
        }
      }
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
      // We're in trouble if neither this._text, nor this._parseTree is found.
      this._text = this.parseTree
        .map(
          node =>
            node.href +
            (node.extraTokens.length > 0
              ? ` ${node.extraTokens.join(' ')}`
              : '')
        )
        .join(', ');
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    outgoingRelations.push(
      ...this.parseTree.map(node => ({
        type: 'SrcSetEntry',
        node,
        href: node.href
      }))
    );
    return outgoingRelations;
  }
}

Object.assign(SrcSet.prototype, {
  notDefaultForContentType: true, // Avoid reregistering application/octet-stream

  supportedExtensions: []
});

module.exports = SrcSet;

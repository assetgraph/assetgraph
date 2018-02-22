const Relation = require('./Relation');

class SrcSetEntry extends Relation {
  set href(href) {
    this.node.href = href;
  }

  get href() {
    return this.node.href;
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    return this;
  }

  attach() {
    throw new Error('SrcSetEntry.attach(): Not supported');
  }

  detach() {
    const fromParseTree = this.from.parseTree;
    const indexInFromParseTree = fromParseTree.indexOf(this.node);
    if (indexInFromParseTree !== -1) {
      fromParseTree.splice(indexInFromParseTree, 1);
    }
    return super.detach();
  }
}

SrcSetEntry.prototype.targetType = 'Image';

module.exports = SrcSetEntry;

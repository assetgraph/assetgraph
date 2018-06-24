const Relation = require('./Relation');

class CssSourceMappingUrl extends Relation {
  get href() {
    return this.node.text.match(/[@#]\s*sourceMappingURL=([^\s]*)/)[1];
  }

  set href(href) {
    this.node.text = this.node.text.replace(
      /([@#]\s*sourceMappingURL=)[^\s]*/,
      `$1${href}`
    );
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    if (position !== 'last') {
      throw new Error(
        "CssSourceMappingUrl.attach(): Only position === 'last' is supported"
      );
    }
    const parseTree = this.from.parseTree;
    parseTree.append('/*# sourceMappingURL=*/');
    this.node = parseTree.nodes[parseTree.nodes.length - 1];
    this.refreshHref();
    super.attach(position, adjacentRelation);
  }

  detach() {
    this.node.parent.removeChild(this.node);
    this.node = undefined;
    return super.detach();
  }
}

CssSourceMappingUrl.prototype.targetType = 'SourceMap';

module.exports = CssSourceMappingUrl;

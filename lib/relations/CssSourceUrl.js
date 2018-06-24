const Relation = require('./Relation');

class CssSourceUrl extends Relation {
  get href() {
    return this.node.text.match(/[@#]\s*sourceURL=([^\s]*)/)[1];
  }

  set href(href) {
    this.node.text = this.node.text.replace(
      /([@#]\s*sourceURL=)[^\s]*/,
      `$1${href}`
    );
  }

  inline() {
    throw new Error('CssSourceUrl.inline(): Not supported');
  }

  attach(position, adjacentRelation) {
    if (position !== 'last') {
      throw new Error(
        "CssSourceUrl.attach(): Only position === 'last' is supported"
      );
    }
    const parseTree = this.from.parseTree;
    parseTree.append({ type: 'comment', value: '@ sourceURL=' });
    this.node = parseTree.nodes[parseTree.nodes.length - 1];
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this.node.text = this.node.text.replace(/[@#]\s*sourceURL=([^\s]*)/, '');
    this.node = undefined;
    return super.detach();
  }
}

module.exports = CssSourceUrl;

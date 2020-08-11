const HtmlRelation = require('../HtmlRelation');

class AtomHtmlInlineFragment extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('entry > content[type=html i]')
    ) {
      return {
        type: 'AtomHtmlInlineFragment',
        to: {
          type: 'Html',
          isFragment: true,
          isInline: true,
          text: node.textContent || '',
        },
        node,
      };
    }
  }

  inline() {
    super.inline();
    this.node.textContent = this.to.text;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement(this.node.nodeName);
    super.attach(position, adjacentRelation);
  }
}

Object.assign(AtomHtmlInlineFragment.prototype, {
  targetType: 'Html',
  _hrefType: 'inline',
});

module.exports = AtomHtmlInlineFragment;

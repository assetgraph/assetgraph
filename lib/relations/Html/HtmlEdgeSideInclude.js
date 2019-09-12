const HtmlRelation = require('../HtmlRelation');

class HtmlEdgeSideInclude extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('esi\\:include[src]')
    ) {
      return {
        type: 'HtmlEdgeSideInclude',
        href: node.getAttribute('src'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  inline() {
    throw new Error('HtmlEdgeSideInclude.inline(): Not implemented yet.');
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('esi:include');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEdgeSideInclude;

const HtmlRelation = require('../HtmlRelation');

class HtmlAudio extends HtmlRelation {
  // Should probably be split into three relation classes:
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('audio[src], audio > track[src], audio > source[src]')
    ) {
      return {
        type: 'HtmlAudio',
        href: node.getAttribute('src'),
        node,
      };
    }
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('audio');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAudio;

const Relation = require('../Relation');

class RssChannelLink extends Relation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('channel > link')) {
      return {
        type: 'RssChannelLink',
        node,
        href: node.textContent || ''
      };
    }
  }

  get href() {
    return this.node.textContent;
  }

  set href(href) {
    this.node.textContent = href;
  }

  inline() {
    throw new Error('RssChannelLink.inline: Not implemented');
  }

  attach(position, adjacentRelation) {
    throw new Error('RssChannelLink.attach: Not implemented');
  }
}

module.exports = RssChannelLink;

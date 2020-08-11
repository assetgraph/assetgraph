const HtmlRelation = require('../HtmlRelation');

class HtmlFluidIconLink extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel=fluid-icon]')
    ) {
      return {
        type: 'HtmlFluidIconLink',
        to: {
          url: node.getAttribute('href'),
          contentType: node.getAttribute('type') || undefined,
        },
        node,
      };
    }
  }

  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'fluid-icon');
    return super.attach(position, adjacentRelation);
  }
}

HtmlFluidIconLink.prototype.targetType = 'Image';

module.exports = HtmlFluidIconLink;

const HtmlRelation = require('../HtmlRelation');

class HtmlFluidIconLink extends HtmlRelation {
  static get selector() {
    return 'link[href][rel=fluid-icon]';
  }

  static handler(node) {
    return {
      type: 'HtmlFluidIconLink',
      to: {
        url: node.getAttribute('href'),
        contentType: node.getAttribute('type') || undefined
      },
      node
    };
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

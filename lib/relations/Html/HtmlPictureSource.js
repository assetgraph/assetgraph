const HtmlRelation = require('../HtmlRelation');

class HtmlPictureSource extends HtmlRelation {
  static get selector() {
    return 'picture > source[src]';
  }

  static handler(node) {
    return {
      type: 'HtmlPictureSource',
      href: node.getAttribute('src'),
      node
    };
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  attach(position, adjacentRelation) {
    // This should probably ensure that the parent element is <picture>, but oh well...
    this.node = this.from.parseTree.createElement('source');
    return super.attach(position, adjacentRelation);
  }
}

HtmlPictureSource.prototype.targetType = 'Image';

module.exports = HtmlPictureSource;

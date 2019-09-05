const HtmlRelation = require('../HtmlRelation');

class HtmlMsApplicationTileImageMeta extends HtmlRelation {
  static get selector() {
    return 'meta[name=msapplication-TileImage][content]';
  }

  static handler(node) {
    return {
      type: 'HtmlMsApplicationTileImageMeta',
      href: node.getAttribute('content'),
      node
    };
  }

  get href() {
    return this.node.getAttribute('content');
  }

  set href(href) {
    this.node.setAttribute('content', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('meta');
    this.node.setAttribute('name', 'msapplication-TileImage');
    return super.attach(position, adjacentRelation);
  }
}

HtmlMsApplicationTileImageMeta.prototype.targetType = 'Image';

module.exports = HtmlMsApplicationTileImageMeta;

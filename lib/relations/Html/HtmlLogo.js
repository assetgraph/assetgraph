const HtmlRelation = require('../HtmlRelation');

class HtmlLogo extends HtmlRelation {
  static get selector() {
    return 'link[href][rel~=logo]';
  }

  static handler(node) {
    return {
      type: 'HtmlLogo',
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
    this.node.setAttribute('rel', 'logo');
    return super.attach(position, adjacentRelation);
  }
}

HtmlLogo.prototype.targetType = 'Image';

module.exports = HtmlLogo;

const HtmlRelation = require('./HtmlRelation');

class HtmlLogo extends HtmlRelation {
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

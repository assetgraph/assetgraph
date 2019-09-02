const HtmlRelation = require('./HtmlRelation');

class HtmlFluidIconLink extends HtmlRelation {
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

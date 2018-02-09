const HtmlRelation = require('./HtmlRelation');

class HtmlAppleTouchStartupImage extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'apple-touch-startup-image');
    return super.attach(position, adjacentRelation);
  }
}

HtmlAppleTouchStartupImage.prototype.targetType = 'Image';

module.exports = HtmlAppleTouchStartupImage;

const HtmlRelation = require('./HtmlRelation');

class HtmlAlternateLink extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'alternate');
    this.node.setAttribute('type', this.to.contentType);
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAlternateLink;

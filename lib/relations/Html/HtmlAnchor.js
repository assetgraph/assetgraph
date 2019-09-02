const HtmlRelation = require('./HtmlRelation');

class HtmlAnchor extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('a');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAnchor;

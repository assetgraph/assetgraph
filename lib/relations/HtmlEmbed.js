const HtmlRelation = require('./HtmlRelation');

class HtmlEmbed extends HtmlRelation {
  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('embed');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEmbed;

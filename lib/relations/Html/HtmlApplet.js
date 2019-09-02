const HtmlRelation = require('./HtmlRelation');

// Requires: config.attributeName
class HtmlApplet extends HtmlRelation {
  get href() {
    return this.node.getAttribute(this.attributeName);
  }

  set href(href) {
    this.node.setAttribute(this.attributeName, href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('applet');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlApplet;

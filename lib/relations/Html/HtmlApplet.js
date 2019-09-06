const HtmlRelation = require('../HtmlRelation');

// Requires: config.attributeName
class HtmlApplet extends HtmlRelation {
  static get selector() {
    return 'applet';
  }

  static handler(node) {
    const relations = [];

    for (const attributeName of ['archive', 'codebase']) {
      // Note: Only supports one url in the archive attribute. The Html 4.01 spec says it can be a comma-separated list.
      if (node.hasAttribute(attributeName)) {
        relations.push({
          type: 'HtmlApplet',
          href: node.getAttribute(attributeName),
          node,
          attributeName
        });
      }
    }
    return relations;
  }

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

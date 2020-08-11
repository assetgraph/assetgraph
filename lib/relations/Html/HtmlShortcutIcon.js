const HtmlRelation = require('../HtmlRelation');

class HtmlShortcutIcon extends HtmlRelation {
  static getRelationsFromNode(node) {
    // Also catches rel="shortcut icon"
    // Can be made nicer when nwmatcher supports :is from https://www.w3.org/TR/selectors-4/ (still draft):
    // return 'link[href]:is([rel~=icon], [rel~=apple-touch-icon], [rel~=apple-touch-icon-precomposed])';
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        'link[rel~=icon][href], link[rel~=apple-touch-icon][href], link[rel~=apple-touch-icon-precomposed][href]'
      )
    ) {
      return {
        type: 'HtmlShortcutIcon',
        href: node.getAttribute('href'),
        node,
      };
    }
  }

  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'shortcut icon'); // Hmm, how to handle apple-touch-icon?
    return super.attach(position, adjacentRelation);
  }
}

HtmlShortcutIcon.prototype.targetType = 'Image';

module.exports = HtmlShortcutIcon;

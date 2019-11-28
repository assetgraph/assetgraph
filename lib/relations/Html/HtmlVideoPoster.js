const HtmlRelation = require('../HtmlRelation');

class HtmlVideoPoster extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('video[poster]')) {
      return {
        type: 'HtmlVideoPoster',
        href: node.getAttribute('poster'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('poster');
  }

  set href(href) {
    this.node.setAttribute('poster', href);
  }

  inlineHtmlRelation() {
    throw new Error('HtmlVideoPoster.inline(): Not supported.');
  }

  attach() {
    throw new Error('HtmlVideoPoster.attach(): Not implemented.');
  }

  detach() {
    throw new Error('HtmlVideoPoster.detach(): Not implemented.');
  }
}

HtmlVideoPoster.prototype.targetType = 'Image';

module.exports = HtmlVideoPoster;

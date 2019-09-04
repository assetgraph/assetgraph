const HtmlRelation = require('../HtmlRelation');

class HtmlMetaRefresh extends HtmlRelation {
  static get selector() {
    return 'meta[http-equiv=refresh]';
  }

  static handler(node) {
    const content = node.getAttribute('content');
    const matchContent =
      content && content.match(/^\d+;\s*url\s*=\s*(.*?)\s*$/);
    if (matchContent) {
      return {
        type: 'HtmlMetaRefresh',
        href: matchContent[1],
        node
      };
    }
  }

  get href() {
    const content = this.node.getAttribute('content');
    const matchContent =
      typeof content === 'string' && content.match(/url=\s*(.*?)\s*$/i);
    if (matchContent) {
      return matchContent[1];
    }
  }

  set href(href) {
    this.node.setAttribute(
      'content',
      this.node.getAttribute('content').replace(/url=.*?/i, `url=${href}`)
    );
  }

  attach(position, adjacentRelation) {
    throw new Error('Not implemented');
  }

  detach() {
    throw new Error('Not implemented');
  }
}

module.exports = HtmlMetaRefresh;

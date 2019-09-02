const HtmlRelation = require('./HtmlRelation');

class HtmlMetaRefresh extends HtmlRelation {
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

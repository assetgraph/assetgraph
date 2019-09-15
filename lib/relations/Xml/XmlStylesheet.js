const Relation = require('../Relation');

class XmlStylesheet extends Relation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.PROCESSING_INSTRUCTION_NODE &&
      node.nodeName === 'xml-stylesheet'
    ) {
      const matchData = node.data.match(/href="([^"]*)"/);
      if (matchData) {
        return {
          type: 'XmlStylesheet',
          node,
          href: matchData[1].replace(/&quot;/, '"').replace(/&amp;/, '&')
        };
      }
    }
  }

  get href() {
    const matchData = this.node.data.match(/href="([^"]*)"/);
    if (matchData) {
      return matchData[1].replace(/&quot;/, '"').replace(/&amp;/, '&');
    }
  }

  set href(href) {
    this.node.data = this.node.data.replace(
      /href="([^"]*)"/,
      `href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`
    );
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('XmlStylesheet.attach: Not supported');
  }

  detach() {
    this.node.parentNode.removeChild(this.node);
    this.node = undefined;
    super.detach();
  }
}

module.exports = XmlStylesheet;

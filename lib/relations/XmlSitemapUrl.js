const Relation = require('./Relation');

class XmlSitemapUrl extends Relation {
  get href() {
    return this.node.childNodes[0] && this.node.childNodes[0].data;
  }

  set href(href) {
    this.node.childNodes[0].data = href;
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('XmlSitemapUrl.attach: Not supported');
  }

  detach() {
    this.node.parentNode.removeChild(this.node);
    this.node = undefined;
    super.detach();
  }
}

module.exports = XmlSitemapUrl;

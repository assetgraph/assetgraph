/**
 *  Implementation of http://w3c.github.io/preload/#dfn-preload
 */

const HtmlResourceHint = require('./HtmlResourceHint');

class HtmlPreloadLink extends HtmlResourceHint {
  get contentType() {
    if (typeof this._contentType === 'undefined') {
      const contentType = this.to.contentType;
      if (contentType && contentType !== 'application/octet-stream') {
        this._contentType = contentType;
      }
    }
    return this._contentType;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'preload');

    if (this.as) {
      this.node.setAttribute('as', this.as);
    }

    if (this.contentType) {
      this.node.setAttribute('type', this.contentType);
    }

    if (this.as === 'font') {
      this.node.setAttribute('crossorigin', 'anonymous');
    }

    super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlPreloadLink;

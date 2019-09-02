const HtmlResourceHint = require('./HtmlResourceHint');

/**
 * @extends {HtmlResourceHint}
 *
 * Implementation of http://w3c.github.io/preload/#dfn-preload
 */
class HtmlPreloadLink extends HtmlResourceHint {
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'preload');

    if (this.as) {
      this.node.setAttribute('as', this.as);
    }

    if (this.contentType) {
      this.node.setAttribute('type', this.contentType);
    }

    if (['font', 'fetch'].includes(this.as)) {
      this.node.setAttribute('crossorigin', 'anonymous');
    }

    super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlPreloadLink;

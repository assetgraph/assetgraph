const Relation = require('./Relation');

/**
 * Base Relation for all types of JavaScript Relations
 *
 * @extends Relation
 */
class JavaScriptRelation extends Relation {
  _fixupSetHref(href) {
    if (
      this.from &&
      this.from.assetGraph &&
      /^file:/.test(this.from.assetGraph.root) &&
      href.startsWith(this.from.assetGraph.root)
    ) {
      // Hack: Force a root-relative url instead of an absolute file url
      // when eg. pointing back into the root from eg. a CDN and we
      // don't know the canonical root:
      return `/${href.substr(this.from.assetGraph.root.length)}`;
    } else {
      return href;
    }
  }
}

module.exports = JavaScriptRelation;

const HtmlRelation = require('./HtmlRelation');

/**
 * @extends {HtmlRelation}
 *
 * Implementation of https://www.w3.org/TR/resource-hints/#prerender
 */
class HtmlPrerenderLink extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'prerender');
    return super.attach(position, adjacentRelation);
  }

  inline() {
    throw new Error(
      'HtmlPrerenderLink: Inlining of resource hints is not allowed'
    );
  }
}

module.exports = HtmlPrerenderLink;

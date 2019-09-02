const HtmlRelation = require('./HtmlRelation');

class HtmlEdgeSideInclude extends HtmlRelation {
  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  inline() {
    throw new Error('HtmlEdgeSideInclude.inline(): Not implemented yet.');
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('esi:include');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEdgeSideInclude;

const HtmlRelation = require('./HtmlRelation');

class HtmlImport extends HtmlRelation {
  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'import');
    return super.attach(position, adjacentRelation);
  }
}

HtmlImport.prototype.targetType = 'Html';

module.exports = HtmlImport;

const Relation = require('./Relation');

class SourceMapFile extends Relation {
  set href(href) {
    this.from.parseTree.file = href;
  }

  get href() {
    return this.from.parseTree.file;
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    return this;
  }

  attach(position, adjacentRelation) {
    this.from.parseTree.file = '<urlGoesHere>';
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this.from.parseTree.file = undefined;
    return super.detach();
  }
}

module.exports = SourceMapFile;

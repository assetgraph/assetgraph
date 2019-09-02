const HtmlRelation = require('./HtmlRelation');

class HtmlAudio extends HtmlRelation {
  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('audio');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAudio;

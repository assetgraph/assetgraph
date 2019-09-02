const HtmlRelation = require('./HtmlRelation');

class HtmlEdgeSideIncludeSafeComment extends HtmlRelation {
  inline() {
    super.inline();
    let text = this.to.text;
    const matchText = this.to.text.match(
      /<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/
    );
    if (matchText) {
      text = matchText[1];
    }

    this.node.nodeValue = `esi ${text}`;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createComment('');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEdgeSideIncludeSafeComment;

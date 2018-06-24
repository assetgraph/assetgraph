const HtmlRelation = require('./HtmlRelation');

class HtmlConditionalComment extends HtmlRelation {
  constructor(config) {
    super(config);
    if (typeof this.condition !== 'string') {
      throw new Error(
        "HtmlConditionalComment constructor: 'condition' config option is mandatory."
      );
    }
  }

  inline() {
    super.inline();
    let text = this.to.text;
    const matchText = this.to.text.match(
      /<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/
    );
    if (matchText) {
      text = matchText[1];
    }

    this.node.nodeValue = `[if ${this.condition}]>${text}<![endif]`;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createComment('');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlConditionalComment.prototype, {
  targetType: 'Html',
  _hrefType: 'inline'
});

module.exports = HtmlConditionalComment;

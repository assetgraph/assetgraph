const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlEdgeSideIncludeSafeComment extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.COMMENT_NODE) {
      const matchEsi = node.nodeValue.match(/^esi([\s\S]*)$/);
      if (matchEsi) {
        return {
          type: 'HtmlEdgeSideIncludeSafeComment',
          to: {
            type: 'Html',
            text: `<!--ASSETGRAPH DOCUMENT START MARKER-->${matchEsi[1]}<!--ASSETGRAPH DOCUMENT END MARKER-->`
          },
          node
        };
      }
    }
  }

  inline() {
    const self = super.inline();
    let text = this.to.text;
    const matchText = this.to.text.match(
      /<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/
    );
    if (matchText) {
      text = matchText[1];
    }

    this.node.nodeValue = `esi ${text}`;
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createComment('');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEdgeSideIncludeSafeComment;

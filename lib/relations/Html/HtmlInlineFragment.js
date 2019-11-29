const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlInlineFragment extends HtmlRelation {
  inline() {
    const self = super.inline();
    this.node.innerHTML = this.to.text;
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement(this.node.nodeName);
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlInlineFragment;

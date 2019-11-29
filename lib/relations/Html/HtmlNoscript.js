const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlNoscript extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('noscript')) {
      return {
        type: 'HtmlNoscript',
        to: {
          type: 'Html',
          isFragment: true,
          isInline: true,
          text: node.innerHTML || ''
        },
        node
      };
    }
  }

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
    this.node = this.from.parseTree.createElement('noscript');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlNoscript.prototype, {
  targetType: 'Html',
  _hrefType: 'inline'
});

module.exports = HtmlNoscript;

const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlContentSecurityPolicy extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        'meta[http-equiv=Content-Security-Policy], meta[http-equiv=Content-Security-Policy-Report-Only]'
      )
    ) {
      return {
        type: 'HtmlContentSecurityPolicy',
        to: {
          isExternalizable: false,
          type: 'ContentSecurityPolicy',
          text: node.getAttribute('content')
        },
        node
      };
    }
  }

  inline() {
    const self = super.inline();
    this.node.setAttribute('content', this.to.text);
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('meta');
    this.node.setAttribute('http-equiv', 'Content-Security-Policy');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlContentSecurityPolicy.prototype, {
  targetType: 'ContentSecurityPolicy',
  _hrefType: 'inline'
});

module.exports = HtmlContentSecurityPolicy;

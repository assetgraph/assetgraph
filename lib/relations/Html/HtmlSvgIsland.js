const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlSvgIsland extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('svg')) {
      return {
        type: 'HtmlSvgIsland',
        to: {
          type: 'Svg',
          isExternalizable: false,
          text: node.outerHTML
        },
        node
      };
    }
  }

  /**
   * @param {HTMLElement} node
   */
  static stopTraversal(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('svg')) {
      return true;
    }
  }

  inline() {
    const self = super.inline();

    // Get the outerHTML of the documentElement instead of serializing
    // the childNodes, avoiding a duplication of xmlns attributes:
    const svgText = this.to.parseTree.documentElement.outerHTML.replace(
      /^<svg[^>]*>\s*|\s*<\/svg>\n?$/g,
      ''
    );
    const isSeenByAttributeName = {};
    for (const attribute of Array.from(
      this.to.parseTree.documentElement.attributes
    )) {
      this.node.setAttribute(attribute.name, attribute.value);
      isSeenByAttributeName[attribute.name] = true;
    }

    const attributeNames = Array.from(this.node.attributes).map(a => a.name);
    for (const attributeName of attributeNames) {
      if (!isSeenByAttributeName[attributeName]) {
        this.node.removeAttribute(attributeName);
      }
    }

    this.node.innerHTML = svgText;
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    throw new Error('Not implemented');
  }
}

HtmlSvgIsland.prototype._hrefType = 'inline';

module.exports = HtmlSvgIsland;

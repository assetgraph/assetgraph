const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlImage extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('img[src]')) {
      return {
        type: 'HtmlImage',
        href: node.getAttribute('src'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute(this.attributeName);
  }

  set href(href) {
    this.node.setAttribute(this.attributeName, href);
  }

  /** @type {string} */
  get decoding() {
    if (this.node) {
      const decoding = this.node.getAttribute('decoding');
      if (decoding) {
        return decoding.trim().toLowerCase();
      }
    } else {
      return this._decoding;
    }
  }

  set decoding(decoding) {
    if (this.node) {
      if (decoding) {
        this.node.setAttribute('decoding', decoding.trim().toLowerCase());
        this.from.markDirty();
      } else if (this.node.hasAttribute('decoding')) {
        this.from.markDirty();
        this.node.removeAttribute('decoding');
      }
    } else {
      this._decoding = decoding;
    }
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('img');
    if (this._decoding) {
      this.node.setAttribute('decoding', this._decoding.trim().toLowerCase());
      this._decoding = undefined;
    }
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this._decoding = this.decoding;
    return super.detach();
  }
}

HtmlImage.prototype.attributeName = 'src';
HtmlImage.prototype.targetType = 'Image';

module.exports = HtmlImage;

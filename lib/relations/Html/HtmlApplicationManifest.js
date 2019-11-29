const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * Models application manifests.
 *
 * See following resources for further details
 *
 * - https://developers.google.com/web/updates/2014/11/Support-for-installable-web-apps-with-webapp-manifest-in-chrome-38-for-Android
 * - https://developer.chrome.com/multidevice/android/installtohomescreen
 */
/**
 * @extends HtmlRelation
 */
class HtmlApplicationManifest extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[rel~=manifest][href]')
    ) {
      return {
        type: 'HtmlApplicationManifest',
        to: {
          type: 'ApplicationManifest',
          url: node.getAttribute('href')
        },
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'manifest');
    return super.attach(position, adjacentRelation);
  }
}

HtmlApplicationManifest.prototype.targetType = 'ApplicationManifest';

module.exports = HtmlApplicationManifest;

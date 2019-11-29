// https://w3c.github.io/ServiceWorker/#link-type-serviceworker

const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlServiceWorkerRegistration extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=serviceworker]')
    ) {
      return {
        type: 'HtmlServiceWorkerRegistration',
        href: node.getAttribute('href'),
        scope: node.getAttribute('scope'),
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
    this.node.setAttribute('rel', 'serviceworker');

    if (this.scope) {
      this.node.setAttribute('scope', this.scope);
    }

    return super.attach(position, adjacentRelation);
  }

  inline() {
    throw new Error(
      'HtmlServiceWorkerRegistration: Inlining of service worker relations is not allowed'
    );
  }
}

HtmlServiceWorkerRegistration.prototype.targetType = 'JavaScript';

module.exports = HtmlServiceWorkerRegistration;

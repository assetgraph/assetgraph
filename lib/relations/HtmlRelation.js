const Relation = require('./Relation');

/** @typedef {import('../assets/Html')} Html */
/** @typedef {import('./Relation')} Relation */

/**
 * @typedef {{
 *   node?: HTMLElement,
 *   attributeName?: string
 * }} HtmlRelationConfigSpecifics
 * @typedef {import('./Relation').RelationConfig & HtmlRelationConfigSpecifics} HtmlRelationConfig
 */

/**
 * Base Relation for all types of HTML Relations
 *
 * @extends Relation
 */
class HtmlRelation extends Relation {
  // Override in subclass for relations that don't support inlining, are attached to attributes, etc.
  inline() {
    const self = super.inline();
    if (this.to.type === 'JavaScript') {
      // eslint-disable-next-line no-script-url
      this.href = `javascript:${this.to.text}`;
    } else {
      this.href = this.to.dataUrl + (this.fragment || '');
    }
    this.from.markDirty();
    return self;
  }

  /**
   * @param {Relation.RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentNodeOrRelation
   * @return {this}
   */
  attach(position, adjacentNodeOrRelation) {
    const document = this.from.parseTree;
    const outgoingRelations = /** @type {HtmlRelation[]} */ (this.from
      .outgoingRelations);
    /** @type {HtmlRelation} */
    let adjacentRelation;
    if (this.node === document.documentElement) {
      // HtmlCacheManifest, don't juggle around the node
      adjacentRelation = /** @type {HtmlRelation} */ (adjacentNodeOrRelation);
    } else {
      // Don't try to reattach an HtmlCacheManifest node (<html manifest=...>)
      if (
        this.from.isFragment &&
        (position === 'first' || position === 'last')
      ) {
        // Document fragments won't have <head> nor <body>, and inserting into document.documentElement
        // won't work:
        position += 'InBody';
      }
      if (position.startsWith('firstIn') || position.startsWith('lastIn')) {
        // {last,first}In{Head,Body}
        const isBeforeOrAfter = position === 'before' || position === 'after';
        const headOrBody =
          !isBeforeOrAfter && position.endsWith('Body') ? 'body' : 'head';
        const firstOrLast =
          !isBeforeOrAfter && position.startsWith('first') ? 'first' : 'last';
        let headOrBodyNode = document[headOrBody];
        if (!headOrBodyNode) {
          // The relevant element, <head> or <body>, isn't present in the document,
          // try to create it if the <html> node is at least there:
          if (!document.documentElement) {
            const err = new Error(
              `HtmlRelation.attach: Could not attach asset ${this.to.toString()} to <${headOrBody}>. Missing <html> and <${headOrBody}>`
            );
            err.asset = this.from;
            throw err;
          }
          headOrBodyNode = document.createElement(headOrBody);
          if (headOrBody === 'head') {
            document.documentElement.insertBefore(
              headOrBodyNode,
              document.documentElement.firstChild
            );
          } else {
            document.documentElement.appendChild(headOrBodyNode);
          }
        }

        /** @type {HtmlRelation[]} */
        let existingRelationsInSameSection;
        let neighbouringRelationInOtherSection;
        if (headOrBody === 'head') {
          existingRelationsInSameSection = outgoingRelations.filter(
            relation =>
              relation !== this && relation.node.parentNode === document.head
          );
          if (existingRelationsInSameSection.length === 0) {
            neighbouringRelationInOtherSection = outgoingRelations.find(
              relation =>
                relation !== this &&
                (relation.node.matches
                  ? relation.node.matches('body *')
                  : relation.node.parentNode.matches('body *'))
            );
          }
        } else if (headOrBody === 'body') {
          existingRelationsInSameSection = outgoingRelations.filter(
            relation =>
              relation !== this &&
              (relation.node.matches
                ? relation.node.matches('body *')
                : relation.node.parentNode.matches('body *'))
          );
          const headRelations = outgoingRelations.filter(
            relation =>
              relation !== this && relation.node.parentNode === document.head
          );
          neighbouringRelationInOtherSection =
            headRelations[headRelations.length - 1];
        }

        if (firstOrLast === 'first') {
          headOrBodyNode.insertBefore(this.node, headOrBodyNode.firstChild);
          if (existingRelationsInSameSection.length > 0) {
            position = 'before';
            adjacentRelation = existingRelationsInSameSection[0];
          } else if (neighbouringRelationInOtherSection) {
            position = headOrBody === 'head' ? 'before' : 'after';
            adjacentRelation = neighbouringRelationInOtherSection;
          } else {
            position = 'last';
          }
        }

        if (firstOrLast === 'last') {
          headOrBodyNode.appendChild(this.node);
          if (existingRelationsInSameSection.length > 0) {
            position = 'after';
            adjacentRelation =
              existingRelationsInSameSection[
                existingRelationsInSameSection.length - 1
              ];
          } else if (neighbouringRelationInOtherSection) {
            position = headOrBody === 'head' ? 'before' : 'after';
            adjacentRelation = neighbouringRelationInOtherSection;
          } else {
            position = 'last';
          }
        }
      } else if (position === 'before' || position === 'after') {
        /** @type {HTMLElement} */
        let adjacentNode;
        if ('isRelation' in adjacentNodeOrRelation) {
          adjacentRelation = /** @type {HtmlRelation} */ (adjacentNodeOrRelation);
          adjacentNode = adjacentRelation.node;
          if (position === 'before') {
            adjacentNode.parentNode.insertBefore(this.node, adjacentNode);
          } else if (position === 'after') {
            adjacentNode.parentNode.insertBefore(
              this.node,
              adjacentNode.nextSibling
            );
          }
        } else {
          adjacentNode = adjacentNodeOrRelation;
          if (position === 'before') {
            const firstRelationAfter = outgoingRelations.find(
              relation =>
                relation !== this &&
                (adjacentNode === relation.node ||
                  adjacentNode.compareDocumentPosition(relation.node) &
                    relation.node.DOCUMENT_POSITION_FOLLOWING)
            );
            if (firstRelationAfter) {
              adjacentRelation = firstRelationAfter;
            } else {
              position = 'last';
            }
            adjacentNode.parentNode.insertBefore(this.node, adjacentNode);
          }
          if (position === 'after') {
            const relationsBeforeOrAtAdjacentNode = outgoingRelations.filter(
              relation =>
                relation !== this &&
                (adjacentNode === relation.node ||
                  adjacentNode.compareDocumentPosition(relation.node) &
                    relation.node.DOCUMENT_POSITION_PRECEDING)
            );
            if (relationsBeforeOrAtAdjacentNode.length > 0) {
              adjacentRelation =
                relationsBeforeOrAtAdjacentNode[
                  relationsBeforeOrAtAdjacentNode.length - 1
                ];
            } else {
              position = 'first';
            }
            adjacentNode.parentNode.insertBefore(
              this.node,
              adjacentNode.nextSibling
            );
          }
        }
      } else if (position === 'last') {
        let lastExistingRelation;
        // Poor man's Array#findLast:
        for (let i = outgoingRelations.length - 1; i >= 0; i -= 1) {
          const relation = outgoingRelations[i];
          if (relation !== this && relation.type === this.type) {
            lastExistingRelation = relation;
            break;
          }
        }
        if (lastExistingRelation) {
          lastExistingRelation.node.parentNode.insertBefore(
            this.node,
            lastExistingRelation.node.nextSibling
          );
        } else if (document.head && this.preferredPosition === 'firstInHead') {
          document.head.insertBefore(this.node, document.head.firstChild);
        } else if (document.head && this.preferredPosition === 'lastInHead') {
          document.head.appendChild(this.node);
        } else if (document.body) {
          if (this.preferredPosition === 'lastInBody') {
            document.body.appendChild(this.node);
          } else {
            document.body.insertBefore(this.node, document.body.firstChild);
          }
        } else {
          // SVG or fragment
          document.documentElement.appendChild(this.node);
        }
        if (this.node.compareDocumentPosition) {
          // not supported by xmldom
          const relationsBefore = outgoingRelations.filter(
            relation =>
              relation !== this &&
              (this.node === relation.node ||
                this.node.compareDocumentPosition(relation.node) &
                  relation.node.DOCUMENT_POSITION_PRECEDING)
          );
          if (relationsBefore.length > 0) {
            adjacentRelation = relationsBefore[relationsBefore.length - 1];
            position = 'after';
          } else {
            position = 'last';
          }
        }
      } else if (position === 'first') {
        const firstExistingRelation = outgoingRelations.find(
          relation => relation !== this && relation.type === this.type
        );
        if (firstExistingRelation) {
          firstExistingRelation.node.parentNode.insertBefore(
            this.node,
            firstExistingRelation.node
          );
        } else if (document.head && this.preferredPosition === 'firstInHead') {
          document.head.insertBefore(this.node, document.head.firstChild);
        } else if (document.head && this.preferredPosition === 'lastInHead') {
          document.head.appendChild(this.node);
        } else if (document.body) {
          if (this.preferredPosition === 'lastInBody') {
            document.body.appendChild(this.node);
          } else {
            document.body.insertBefore(this.node, document.body.firstChild);
          }
        } else {
          document.documentElement.insertBefore(
            this.node,
            document.documentElement.firstChild
          );
        }
        if (this.node.compareDocumentPosition) {
          // not supported by xmldom
          adjacentRelation = outgoingRelations.find(
            relation =>
              relation !== this &&
              (this.node === relation.node ||
                this.node.compareDocumentPosition(relation.node) &
                  relation.node.DOCUMENT_POSITION_FOLLOWING)
          );
          if (adjacentRelation) {
            position = 'before';
          } else {
            position = 'last';
          }
        }
      }
    }
    return super.attach(position, adjacentRelation);
  }

  // Override in subclass for relations that aren't detached by removing this.node from the DOM.
  detach() {
    if (this.node) {
      this.node.parentNode.removeChild(this.node);
      this.node = undefined;
    }
    return super.detach();
  }
}

/** @type {Html} */
HtmlRelation.prototype.from = undefined;

/** @type {HTMLElement} */
HtmlRelation.prototype.node = undefined;

/** @type {string} */
HtmlRelation.prototype.preferredPosition = undefined;

/** @type {string} */
HtmlRelation.prototype.attributeName;

module.exports = HtmlRelation;

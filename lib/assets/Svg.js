const JSDOM = require('jsdom').JSDOM;
const Xml = require('./Xml');
const {
  addMissingNamespaces,
  removeAddedNamespaces
} = require('../util/svgNamespaces');

class Svg extends Xml {
  _initJsdom(text) {
    const jsdomSrc = this.isInline ? addMissingNamespaces(text) : text;
    return new JSDOM(jsdomSrc, {
      url: this.url ? this.url : undefined, // So that errors get reported with the url (awaiting https://github.com/jsdom/jsdom/pull/2630)
      contentType: 'application/svg+xml'
    });
  }

  _serializeJsdom(jsdom) {
    const serialized = jsdom.serialize();
    const svgSrc = this.isInline
      ? removeAddedNamespaces(serialized)
      : serialized;
    return `${this.xmlDeclaration}${svgSrc}`;
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    const nodeGenerator = this._visitAllNodesInDom();
    let stopTraversal = false;
    while (true) {
      const { done, value: node } = nodeGenerator.next(stopTraversal);
      if (done) {
        break;
      }
      stopTraversal = false;
      for (const Relation of Svg.relations) {
        if (Relation.getRelationsFromNode) {
          let relations = Relation.getRelationsFromNode(node, this);
          if (Relation.stopTraversal && Relation.stopTraversal(node, this)) {
            stopTraversal = true;
          }
          if (relations) {
            if (!Array.isArray(relations)) {
              relations = [relations];
            }
            for (const relation of relations) {
              relation.type = relation.type || Relation.name;
            }
            outgoingRelations.push(...relations);
          }
        }
      }
    }
    return outgoingRelations;
  }
}

Object.assign(Svg.prototype, {
  contentType: 'image/svg+xml',

  isImage: true,

  supportedExtensions: ['.svg']
});

module.exports = Svg;

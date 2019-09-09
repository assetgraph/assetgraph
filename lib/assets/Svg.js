const Xml = require('./Xml');

class Svg extends Xml {
  static registerRelation(Class) {
    this.relations.add(Class);
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }

    const selectorInfos = [];
    for (const Relation of Svg.relations) {
      const selector = Relation.selector;
      if (selector) {
        selectorInfos.push({
          selector,
          Relation,
          handler: Relation.handler
        });
      }
    }

    const queue = [this.parseTree];
    while (queue.length > 0) {
      const node = queue.shift();

      let stopTraversal = false;
      if (node.nodeType === node.ELEMENT_NODE) {
        for (const { selector, handler, Relation } of selectorInfos) {
          if (node.matches(selector)) {
            stopTraversal = stopTraversal || Relation.stopTraversal;
            let relations = handler(node, this);
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

      if (!stopTraversal && node.childNodes) {
        for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
          queue.unshift(node.childNodes[i]);
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

Svg.relations = new Set();

module.exports = Svg;

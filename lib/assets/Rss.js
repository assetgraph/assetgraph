const Xml = require('./Xml');

class Rss extends Xml {
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
      for (const Relation of Rss.relations) {
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

Object.assign(Rss.prototype, {
  contentType: 'application/rss+xml',

  supportedExtensions: ['.rdf', '.rss'],
});

module.exports = Rss;

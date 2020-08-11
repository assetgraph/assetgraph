const Json = require('./Json');

class ApplicationManifest extends Json {
  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }

    const manifest = this.parseTree;

    if (!manifest) {
      return outgoingRelations;
    }

    for (const Relation of ApplicationManifest.relations) {
      if (Relation.getRelationsFromNode) {
        let relations = Relation.getRelationsFromNode(manifest, this);
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
    return outgoingRelations;
  }
}

Object.assign(ApplicationManifest.prototype, {
  contentType: 'application/manifest+json',

  supportedExtensions: ['.webmanifest'],
});

module.exports = ApplicationManifest;

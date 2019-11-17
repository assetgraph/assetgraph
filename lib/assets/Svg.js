const JSDOM = require('jsdom').JSDOM;
const Xml = require('./Xml');

const fakeNamespaceUrl = 'http://fake';
const fakeNamespaceMatcher = new RegExp(
  ` xmlns:[^=]+="${fakeNamespaceUrl}"`,
  'g'
);

function addMissingNamespaces(xmlSource) {
  const usedNamespaceMatches = xmlSource.match(/ [a-z]+:[a-z]+ *=/g);
  const usedNamespaces = (usedNamespaceMatches || [])
    .map(str => str.slice(1).split(':')[0])
    .filter(str => !['xml', 'xmlns'].includes(str));

  if (usedNamespaces.length === 0) {
    return xmlSource;
  }

  const missingNamespaces = usedNamespaces.filter(
    ns => !xmlSource.includes(`xmlns:${ns}`)
  );
  const injectedSource = missingNamespaces.map(
    ns => `xmlns:${ns}="${fakeNamespaceUrl}"`
  );

  return xmlSource.replace('<svg', `<svg ${injectedSource}`);
}

function removeAddedNamespaces(xmlSource) {
  return xmlSource.replace(fakeNamespaceMatcher, '');
}

class Svg extends Xml {
  _initJsdom(text) {
    return new JSDOM(addMissingNamespaces(text), {
      url: this.url ? this.url : undefined, // So that errors get reported with the url (awaiting https://github.com/jsdom/jsdom/pull/2630)
      contentType: 'application/svg+xml'
    });
  }

  _serializeJsdom(jsdom) {
    return `${this.xmlDeclaration}${removeAddedNamespaces(jsdom.serialize())}`;
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

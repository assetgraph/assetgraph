const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssFontFaceSrc extends CssUrlTokenRelation {
  static getRelationsFromNode(node) {
    if (node.type === 'atrule' && node.name.toLowerCase() === 'font-face') {
      let outgoingRelations;
      for (const childNode of node.nodes) {
        if (
          childNode.type === 'decl' &&
          childNode.prop.toLowerCase() === 'src'
        ) {
          for (const [
            tokenNumber,
            href
          ] of this.prototype
            .findUrlsInPropertyValue(childNode.value)
            .entries()) {
            const tokenString = childNode.value.split(href)[1];
            const match = tokenString.match(
              /['"]?\) *format\(['"]?([^)'"]+)['"]?\)/i
            );
            const format = match && match[1];
            outgoingRelations = outgoingRelations || [];
            outgoingRelations.push({
              type: 'CssFontFaceSrc',
              href,
              tokenNumber,
              parentNode: node.parent,
              node,
              propertyNode: childNode,
              format // This should probably be changed to a getter/setter on CssFontFaceSrc in the future
            });
          }
        }
      }
      return outgoingRelations;
    }
  }
}

Object.assign(CssFontFaceSrc.prototype, {
  targetType: 'Font'
});

module.exports = CssFontFaceSrc;

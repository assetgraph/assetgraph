const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssAlphaImageLoader extends CssUrlTokenRelation {
  static getRelationsFromNode(node) {
    if (node.type === 'rule') {
      let outgoingRelations;
      for (const childNode of node.nodes) {
        if (!childNode.prop) {
          continue;
        }
        const propertyName = childNode.prop.toLowerCase();
        const propertyValue = childNode.value;
        if (propertyName === 'filter' || propertyName === '-ms-filter') {
          for (const [
            tokenNumber,
            href
          ] of this.prototype
            .findUrlsInPropertyValue(propertyValue)
            .entries()) {
            outgoingRelations = outgoingRelations || [];
            outgoingRelations.push({
              type: 'CssAlphaImageLoader',
              href,
              tokenNumber,
              parentNode: node.parent,
              node,
              propertyNode: childNode
            });
          }
        }
      }
      return outgoingRelations;
    }
  }

  createUrlToken(href) {
    // Quote if necessary:
    return `src='${href.replace(/(['"])/g, '\\$1')}'`;
  }

  detach() {
    this.node.removeChild(this.propertyNode);
    return super.detach();
  }
}

Object.assign(CssAlphaImageLoader.prototype, {
  // Singlequoted url must come first, then doublequoted url
  tokenRegExp: /\bsrc=(?:'((?:[^']|\\')*)'|"((?:[^"]|\\")*)")/g
});

module.exports = CssAlphaImageLoader;

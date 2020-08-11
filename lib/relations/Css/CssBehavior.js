const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssBehavior extends CssUrlTokenRelation {
  static getRelationsFromNode(node) {
    if (node.type === 'rule') {
      for (const childNode of node.nodes) {
        if (!childNode.prop) {
          continue;
        }
        const propertyName = childNode.prop.toLowerCase();
        const propertyValue = childNode.value;
        if (propertyName === 'behavior') {
          // Skip behavior properties that have # as the first char in the url so that
          // stuff like behavior(#default#VML) won't be treated as a relation.
          const matchUrl = propertyValue.match(
            /\burl\(('|"|)([^#'"][^'"]*?)\1\)/
          );
          if (matchUrl) {
            return {
              type: 'CssBehavior',
              href: matchUrl[2],
              parentNode: node.parent,
              node,
              propertyNode: childNode,
            };
          }
        }
      }
    }
  }
}

CssBehavior.prototype.targetType = 'Htc';

module.exports = CssBehavior;

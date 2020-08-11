const CssUrlTokenRelation = require('./CssUrlTokenRelation');

const propertyWithImageUrlRegExp = /^(?:content|_?cursor|_?background(?:-image)?|(?:-[a-z]+-)?(?:border-image(?:-source)?|mask|mask-image|mask-image-source|mask-box-image|mask-box-image-source)|(?:\+|-webkit-)?filter)$/i;

class CssImage extends CssUrlTokenRelation {
  static getRelationsFromNode(node) {
    let outgoingRelations;
    if (node.type === 'rule') {
      for (const childNode of node.nodes) {
        if (!childNode.prop) {
          continue;
        }
        const propertyName = childNode.prop.toLowerCase();
        const propertyValue = childNode.value;
        if (propertyWithImageUrlRegExp.test(propertyName)) {
          outgoingRelations = outgoingRelations || [];
          for (const [
            tokenNumber,
            href,
          ] of this.prototype
            .findUrlsInPropertyValue(propertyValue)
            .entries()) {
            if (!/^#/.test(href)) {
              // Don't model eg. filter: url(#foo);
              outgoingRelations.push({
                type: 'CssImage',
                href,
                tokenNumber,
                parentNode: node.parent,
                node,
                propertyNode: childNode,
              });
            }
          }
        }
      }
    }
    return outgoingRelations;
  }
}

CssImage.prototype.targetType = 'Image';

module.exports = CssImage;

const _ = require('lodash');
const HtmlRelation = require('./HtmlRelation');

class HtmlSvgIsland extends HtmlRelation {
  inline() {
    super.inline();
    const svgText = Array.from(this.to.parseTree.documentElement.childNodes)
      .map(svgElementChildNode => svgElementChildNode.toString())
      .join('');

    const isSeenByAttributeName = {};
    for (const attribute of Array.from(
      this.to.parseTree.documentElement.attributes
    )) {
      this.node.setAttribute(attribute.name, attribute.value);
      isSeenByAttributeName[attribute.name] = true;
    }

    for (const attributeName of _.map(this.node.attributes, 'name')) {
      if (!isSeenByAttributeName[attributeName]) {
        this.node.removeAttribute(attributeName);
      }
    }

    this.node.innerHTML = svgText;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    throw new Error('Not implemented');
  }
}

HtmlSvgIsland.prototype._hrefType = 'inline';

module.exports = HtmlSvgIsland;

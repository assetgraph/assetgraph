const SvgRelation = require('./SvgRelation');

class SvgStyle extends SvgRelation {
  get href() {
    return undefined;
  }

  set href(href) {
    const document = this.from.parseTree;
    const styleSheetNode = document.createProcessingInstruction(
      'xml-stylesheet',
      `type="${this.to.contentType}" href="${href}"`
    );

    document.insertBefore(
      styleSheetNode,
      document.getElementsByTagName('svg')[0]
    );

    const xmlStylesheet = this.from.addRelation({
      type: 'XmlStylesheet',
      to: this.to,
      node: styleSheetNode
    });

    // Cleanup
    this.node.parentNode.removeChild(this.node);
    this.from.removeRelation(this);

    this.from.markDirty();

    return xmlStylesheet;
  }

  inline() {}

  attach(position, adjacentRelation) {
    const parseTree = this.from.parseTree;

    this.node = this.node || parseTree.createElement('style');
    this.node.appendChild(parseTree.createTextNode(this.to.text));

    return super.attach(position, adjacentRelation);
  }
}

SvgStyle.prototype.targetType = 'Css';

module.exports = SvgStyle;

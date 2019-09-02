const HtmlRelation = require('./HtmlRelation');

class HtmlImport extends HtmlRelation {
  static get selector() {
    return 'link[rel~=import]';
  }

  static handler(node) {
    // HtmlImport specification: http://w3c.github.io/webcomponents/spec/imports/
    return {
      type: 'HtmlImport',
      to: {
        url: node.getAttribute('href'),
        type: 'Html',
        // Web Compoonents are explicitly not to be treated as HTML fragments
        // Override automated isFragment resolving here
        isFragment: false
      },
      node
    };
  }

  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'import');
    return super.attach(position, adjacentRelation);
  }
}

HtmlImport.prototype.targetType = 'Html';

module.exports = HtmlImport;

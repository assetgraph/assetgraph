const Xml = require('./Xml');

class Atom extends Xml {
  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    const queue = [this.parseTree];

    while (queue.length > 0) {
      const node = queue.shift();

      if (node.childNodes) {
        for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
          queue.unshift(node.childNodes[i]);
        }
      }

      if (
        node.nodeType === 1 &&
        node.nodeName.toLowerCase() === 'content' &&
        node.getAttribute('type').toLowerCase() === 'html' &&
        node.parentNode.nodeType === 1 &&
        node.parentNode.nodeName.toLowerCase() === 'entry'
      ) {
        outgoingRelations.push({
          type: 'XmlHtmlInlineFragment',
          to: {
            type: 'Html',
            isFragment: true,
            isInline: true,
            text: node.textContent || ''
          },
          node
        });
      }
    }

    return outgoingRelations;
  }
}

Object.assign(Atom.prototype, {
  contentType: 'application/atom+xml',

  supportedExtensions: ['.atom']
});

module.exports = Atom;

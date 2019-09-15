const Relation = require('../Relation');

class MsApplicationConfigPollingUri extends Relation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        `
        browserconfig > msapplication > badge > polling-uri,
        msapplication > notification > polling-uri,
        msapplication > notification > polling-uri2,
        msapplication > notification > polling-uri3,
        msapplication > notification > polling-uri4,
        msapplication > notification > polling-uri5
        `
      )
    ) {
      return {
        type: 'MsApplicationConfigPollingUri',
        to: {
          type: 'Xml',
          url: node.getAttribute('src')
        },
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  inline() {
    throw new Error('MsApplicationConfigPollingUri.inline: Not supported');
  }

  attach() {
    throw new Error('MsApplicationConfigPollingUri.attach: Not supported');
  }

  detach() {
    this.node.parentNode.removeChild(this.node);
    this.node = undefined;
    return super.detach();
  }
}

module.exports = MsApplicationConfigPollingUri;

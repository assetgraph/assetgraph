const Xml = require('./Xml');

class MsApplicationConfig extends Xml {
  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    const queue = [this.parseTree];

    while (queue.length > 0) {
      const node = queue.shift();

      if (node.childNodes) {
        for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
          queue.unshift(node.childNodes[i]);
        }
      }

      // Tiles
      if (
        node.parentNode &&
        node.parentNode.nodeType === 1 &&
        node.parentNode.nodeName.toLowerCase() === 'tile' &&
        node.parentNode.parentNode.nodeType === 1 &&
        node.parentNode.parentNode.nodeName.toLowerCase() === 'msapplication' &&
        node.parentNode.parentNode.parentNode.nodeType === 1 &&
        node.parentNode.parentNode.parentNode.nodeName.toLowerCase() ===
          'browserconfig'
      ) {
        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'tileimage'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigImage',
            href: node.getAttribute('src'),
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'square70x70logo'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigImage',
            href: node.getAttribute('src'),
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'square150x150logo'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigImage',
            href: node.getAttribute('src'),
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'wide310x150logo'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigImage',
            href: node.getAttribute('src'),
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'square310x310logo'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigImage',
            href: node.getAttribute('src'),
            node
          });
        }
      }

      // Badge
      if (
        node.parentNode &&
        node.parentNode.nodeType === 1 &&
        node.parentNode.nodeName.toLowerCase() === 'badge' &&
        node.parentNode.parentNode.nodeType === 1 &&
        node.parentNode.parentNode.nodeName.toLowerCase() === 'msapplication' &&
        node.parentNode.parentNode.parentNode.nodeType === 1 &&
        node.parentNode.parentNode.parentNode.nodeName.toLowerCase() ===
          'browserconfig'
      ) {
        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'polling-uri'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigPollingUri',
            to: {
              type: 'Xml',
              url: node.getAttribute('src')
            },
            node
          });
        }
      }

      // Notification
      if (
        node.parentNode &&
        node.parentNode.nodeType === 1 &&
        node.parentNode.nodeName.toLowerCase() === 'notification' &&
        node.parentNode.parentNode.nodeType === 1 &&
        node.parentNode.parentNode.nodeName.toLowerCase() === 'msapplication' &&
        node.parentNode.parentNode.parentNode.nodeType === 1 &&
        node.parentNode.parentNode.parentNode.nodeName.toLowerCase() ===
          'browserconfig'
      ) {
        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'polling-uri'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigPollingUri',
            to: {
              type: 'Xml',
              url: node.getAttribute('src')
            },
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'polling-uri2'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigPollingUri',
            to: {
              type: 'Xml',
              url: node.getAttribute('src')
            },
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'polling-uri3'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigPollingUri',
            to: {
              type: 'Xml',
              url: node.getAttribute('src')
            },
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'polling-uri4'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigPollingUri',
            to: {
              type: 'Xml',
              url: node.getAttribute('src')
            },
            node
          });
        }

        if (
          node.nodeType === 1 &&
          node.nodeName.toLowerCase() === 'polling-uri5'
        ) {
          outgoingRelations.push({
            type: 'MsApplicationConfigPollingUri',
            to: {
              type: 'Xml',
              url: node.getAttribute('src')
            },
            node
          });
        }
      }
    }

    return outgoingRelations;
  }
}

Object.assign(MsApplicationConfig.prototype, {
  contentType: '',

  supportedExtensions: []
});

module.exports = MsApplicationConfig;

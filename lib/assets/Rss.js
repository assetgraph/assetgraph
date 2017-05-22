/*global require, module*/
const Xml = require('./Xml');
const AssetGraph = require('../AssetGraph');

class Rss extends Xml {
    findOutgoingRelationsInParseTree() {
        const outgoingRelations = super.findOutgoingRelationsInParseTree();
        const queue = [this.parseTree];
        const descriptions = [];

        while (queue.length > 0) {
            const node = queue.shift();

            if (node.childNodes) {
                for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }

            if (node.nodeType === 1 &&
                node.nodeName.toLowerCase() === 'description' &&
                node.parentNode.nodeType === 1 &&
                node.parentNode.nodeName.toLowerCase() === 'item') {

                outgoingRelations.push(new AssetGraph.XmlHtmlInlineFragment({
                    from: this,
                    to: new AssetGraph.Html({
                        isFragment: true,
                        isInline: true,
                        text: node.textContent || ''
                    }),
                    node
                }));

                descriptions.push(node);
            } else if (node.nodeType === 1 &&
                       node.nodeName.toLowerCase() === 'link' &&
                       node.parentNode.nodeType === 1 &&
                       node.parentNode.nodeName.toLowerCase() === 'channel') {
                outgoingRelations.push(new AssetGraph.RssChannelLink({
                    from: this,
                    node,
                    to: {
                        url: node.textContent || ''
                    }
                }));
            }
        }

        return outgoingRelations;
    }
};

Object.assign(Rss.prototype, {
    contentType: 'application/rss+xml',

    supportedExtensions: ['.rdf', '.rss']
});

module.exports = Rss;

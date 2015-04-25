/*global require, module*/
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml'),
    AssetGraph = require('../');

function Rss(config) {
    Xml.call(this, config);
}

util.inherits(Rss, Xml);

extendWithGettersAndSetters(Rss.prototype, {
    contentType: 'application/rss+xml',

    supportedExtensions: ['.rdf', '.rss'],

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Xml.prototype.findOutgoingRelationsInParseTree.call(this),
            queue = [this.parseTree],
            descriptions = [];

        while (queue.length) {
            var node = queue.shift();

            if (node.childNodes) {
                for (var i = node.childNodes.length - 1; i >= 0; i -= 1) {
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
                    node: node
                }));

                descriptions.push(node);
            } else if (node.nodeType === 1 &&
                       node.nodeName.toLowerCase() === 'link' &&
                       node.parentNode.nodeType === 1 &&
                       node.parentNode.nodeName.toLowerCase() === 'channel') {
                outgoingRelations.push(new AssetGraph.RssChannelLink({
                    from: this,
                    node: node,
                    to: {
                        url: node.textContent || ''
                    }
                }));
            }
        }

        return outgoingRelations;
    }
});

module.exports = Rss;

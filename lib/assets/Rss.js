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
        var outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this),
            queue = [this.parseTree],
            link = null,
            descriptions = [];

        while (queue.length) {
            var node = queue.shift();

            if (node.childNodes) {
                for (var i = node.childNodes.length - 1; i >= 0; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }

            if (node.nodeType === 1 &&
                node.nodeName === 'description' &&
                node.parentNode.nodeType === 1 &&
                node.parentNode.nodeName === 'item') {

                outgoingRelations.push(new AssetGraph.HtmlInlineFragment({
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
                       node.nodeName === 'link' &&
                       node.parentNode.nodeType === 1 &&
                       node.parentNode.nodeName === 'channel') {
                outgoingRelations.push(new AssetGraph.RssChannelLink({
                    from: this,
                    node: node,
                    to: {
                        url: node.textContent || ''
                    }
                }));
                link = node;
            }
        }

        return outgoingRelations;
    }
});

module.exports = Rss;

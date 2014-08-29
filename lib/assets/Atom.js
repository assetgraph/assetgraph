var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Xml = require('./Xml'),
    AssetGraph = require('../');

function Atom(config) {
    Xml.call(this, config);
}

util.inherits(Atom, Xml);

extendWithGettersAndSetters(Atom.prototype, {
    contentType: 'application/atom+xml',

    supportedExtensions: ['.atom'],

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Xml.prototype.findOutgoingRelationsInParseTree.call(this),
            queue = [this.parseTree];

        while (queue.length) {
            var node = queue.shift();

            if (node.childNodes) {
                for (var i = node.childNodes.length - 1; i >= 0; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }

            if (node.nodeType === 1 &&
                node.nodeName === 'content' &&
                node.getAttribute('type').toLowerCase() === 'html' &&
                node.parentNode.nodeType === 1 &&
                node.parentNode.nodeName === 'entry') {
                outgoingRelations.push(new AssetGraph.XmlHtmlInlineFragment({
                    from: this,
                    to: new AssetGraph.Html({
                        isFragment: true,
                        isInline: true,
                        text: node.textContent || ''
                    }),
                    node: node
                }));
            }
        }

        return outgoingRelations;
    }
});

module.exports = Atom;

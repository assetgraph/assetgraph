var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../AssetGraph'),
    Xml = require('./Xml');

function Svg(config) {
    Xml.call(this, config);
}

util.inherits(Svg, Xml);

extendWithGettersAndSetters(Svg.prototype, {
    contentType: 'image/svg+xml',

    isImage: true,

    supportedExtensions: ['.svg'],

    _isRelationUrl: function (url) {
        return url && !/^mailto:|^\s*$|^#/i.test(url);
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [],
            queue = [this.parseTree];
        while (queue.length) {
            var node = queue.shift();
            if (node.childNodes) {
                for (var i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }
            if (node.nodeType === 1) { // ELEMENT_NODE
                var nodeName = node.nodeName.toLowerCase();
                if (nodeName === 'script') {
                    var type = node.getAttribute('type');
                    if (!type || type === 'text/javascript') {
                        var href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                        if (href) {
                            if (this._isRelationUrl(href)) {
                                outgoingRelations.push(new AssetGraph.SvgScript({
                                    from: this,
                                    to: {
                                        url: href
                                    },
                                    node: node
                                }));
                            }
                        } else {
                            var inlineAsset = new (require('./JavaScript'))({
                                text: node.firstChild ? node.firstChild.nodeValue : ''
                            });

                            outgoingRelations.push(new AssetGraph.SvgScript({
                                from: this,
                                to: inlineAsset,
                                node: node
                            }));
                        }
                    }
                } else if (nodeName === 'image') {
                    var href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                    if (href && this._isRelationUrl(href)) {
                        outgoingRelations.push(new AssetGraph.SvgImage({
                            from: this,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                }
            }
        }
        return outgoingRelations;
    }
});

module.exports = Svg;

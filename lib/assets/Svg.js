var util = require('util'),
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
    pushType: 'image',

    supportedExtensions: ['.svg'],

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Xml.prototype.findOutgoingRelationsInParseTree.call(this),
            queue = [this.parseTree],
            href,
            isXlink;
        while (queue.length) {
            var node = queue.shift(),
                attribute;
            if (node.childNodes) {
                for (var i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }
            if (node.nodeType === 1) { // ELEMENT_NODE
                for (var j = 0; j < node.attributes.length; j += 1) {
                    attribute = node.attributes[j];
                    if (/^on/i.test(attribute.nodeName)) {
                        outgoingRelations.push(new AssetGraph.SvgInlineEventHandler({
                            from: this,
                            attributeName: attribute.nodeName,
                            to: new (require('./JavaScript'))({
                                isExternalizable: false,
                                text: 'function bogus() {' + attribute.nodeValue + '}'
                            }),
                            node: node
                        }));
                    }
                }
                var nodeName = node.nodeName.toLowerCase();
                if (nodeName === 'script') {
                    var type = node.getAttribute('type');
                    if (!type || type === 'text/javascript') {
                        href = null;
                        isXlink = null;
                        if (node.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                            href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                            isXlink = true;
                        } else if (node.hasAttribute('href')) {
                            href = node.getAttribute('href');
                            isXlink = false;
                        }
                        if (typeof href === 'string') {
                            outgoingRelations.push(new AssetGraph.SvgScript({
                                from: this,
                                isXlink: isXlink,
                                to: {
                                    url: href
                                },
                                node: node
                            }));
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
                } else if (nodeName === 'style') {
                    outgoingRelations.push(new AssetGraph.SvgStyle({
                        from: this,
                        to: new (require('./Css'))({
                            text: node.firstChild ? node.firstChild.nodeValue : ''
                        }),
                        node: node
                    }));
                } else if (nodeName === 'image') {
                    href = null;
                    isXlink = null;
                    if (node.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                        isXlink = true;
                    } else if (node.hasAttribute('href')) {
                        href = node.getAttribute('href');
                        isXlink = false;
                    }
                    if (href) {
                        outgoingRelations.push(new AssetGraph.SvgImage({
                            from: this,
                            isXlink: isXlink,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'a') {
                    href = null;
                    isXlink = null;
                    if (node.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                        isXlink = true;
                    } else if (node.hasAttribute('href')) {
                        href = node.getAttribute('href');
                        isXlink = false;
                    }
                    if (href) {
                        outgoingRelations.push(new AssetGraph.SvgAnchor({
                            from: this,
                            isXlink: isXlink,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'pattern') {
                    href = null;
                    isXlink = null;
                    if (node.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                        isXlink = true;
                    } else if (node.hasAttribute('href')) {
                        href = node.getAttribute('href');
                        isXlink = false;
                    }
                    if (href) {
                        outgoingRelations.push(new AssetGraph.SvgPattern({
                            from: this,
                            isXlink: isXlink,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'use') {
                    href = null;
                    isXlink = null;
                    if (node.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                        isXlink = true;
                    } else if (node.hasAttribute('href')) {
                        href = node.getAttribute('href');
                        isXlink = false;
                    }
                    if (href) {
                        outgoingRelations.push(new AssetGraph.SvgUse({
                            from: this,
                            isXlink: isXlink,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'font-face-uri') {
                    href = null;
                    isXlink = null;
                    if (node.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                        isXlink = true;
                    } else if (node.hasAttribute('href')) {
                        href = node.getAttribute('href');
                        isXlink = false;
                    }
                    if (href) {
                        outgoingRelations.push(new AssetGraph.SvgFontFaceUri({
                            from: this,
                            isXlink: isXlink,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                }
                if (node.hasAttribute('style')) {
                    outgoingRelations.push(new AssetGraph.SvgStyleAttribute({
                        from: this,
                        to: new (require('./Css'))({
                            isExternalizable: false,
                            text: 'bogusselector {' + node.getAttribute('style') + '}'
                        }),
                        node: node
                    }));
                }
            }
        }
        return outgoingRelations;
    }
});

module.exports = Svg;

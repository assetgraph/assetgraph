const AssetGraph = require('../AssetGraph');
const Xml = require('./Xml');

class Svg extends Xml {
    findOutgoingRelationsInParseTree() {
        const outgoingRelations = super.findOutgoingRelationsInParseTree();
        const queue = [this.parseTree];
        let href;
        let isXlink;
        while (queue.length > 0) {
            const node = queue.shift();
            if (node.childNodes) {
                for (let i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }
            if (node.nodeType === 1) { // ELEMENT_NODE
                for (const attribute of Array.from(node.attributes)) {
                    if (/^on/i.test(attribute.nodeName)) {
                        outgoingRelations.push(new AssetGraph.SvgInlineEventHandler({
                            from: this,
                            attributeName: attribute.nodeName,
                            to: new (require('./JavaScript'))({
                                isExternalizable: false,
                                text: 'function bogus() {' + attribute.nodeValue + '}'
                            }),
                            node
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
                                isXlink,
                                to: {
                                    url: href
                                },
                                node
                            }));
                        } else {
                            var inlineAsset = new (require('./JavaScript'))({
                                text: node.firstChild ? node.firstChild.nodeValue : ''
                            });

                            outgoingRelations.push(new AssetGraph.SvgScript({
                                from: this,
                                to: inlineAsset,
                                node
                            }));
                        }
                    }
                } else if (nodeName === 'style') {
                    outgoingRelations.push(new AssetGraph.SvgStyle({
                        from: this,
                        to: new (require('./Css'))({
                            text: node.firstChild ? node.firstChild.nodeValue : ''
                        }),
                        node
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
                            isXlink,
                            to: {
                                url: href
                            },
                            node
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
                            isXlink,
                            to: {
                                url: href
                            },
                            node
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
                            isXlink,
                            to: {
                                url: href
                            },
                            node
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
                            isXlink,
                            to: {
                                url: href
                            },
                            node
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
                            isXlink,
                            to: {
                                url: href
                            },
                            node
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
                        node
                    }));
                }
            }
        }
        return outgoingRelations;
    }
};

Object.assign(Svg.prototype, {
    contentType: 'image/svg+xml',

    isImage: true,

    supportedExtensions: ['.svg']
});

module.exports = Svg;

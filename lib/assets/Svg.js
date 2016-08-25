var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../'),
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
            href;
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
                        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
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
                } else if (nodeName === 'style') {
                    outgoingRelations.push(new AssetGraph.SvgStyle({
                        from: this,
                        to: new (require('./Css'))({
                            text: node.firstChild ? node.firstChild.nodeValue : ''
                        }),
                        node: node
                    }));
                } else if (nodeName === 'image') {
                    href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                    if (href && this._isRelationUrl(href)) {
                        outgoingRelations.push(new AssetGraph.SvgImage({
                            from: this,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'a') {
                    href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                    if (href && this._isRelationUrl(href)) {
                        outgoingRelations.push(new AssetGraph.SvgAnchor({
                            from: this,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'pattern') {
                    href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                    if (href && this._isRelationUrl(href)) {
                        outgoingRelations.push(new AssetGraph.SvgPattern({
                            from: this,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'use') {
                    href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                    if (href && this._isRelationUrl(href)) {
                        outgoingRelations.push(new AssetGraph.SvgUse({
                            from: this,
                            to: {
                                url: href
                            },
                            node: node
                        }));
                    }
                } else if (nodeName === 'font-face-uri') {
                    href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                    if (href && this._isRelationUrl(href)) {
                        outgoingRelations.push(new AssetGraph.SvgFontFaceUri({
                            from: this,
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

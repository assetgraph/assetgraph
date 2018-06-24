const Xml = require('./Xml');

class Svg extends Xml {
  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    const queue = [this.parseTree];
    let href;
    let isXlink;
    while (queue.length > 0) {
      const node = queue.shift();
      if (node.childNodes) {
        for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
          queue.unshift(node.childNodes[i]);
        }
      }
      if (node.nodeType === 1) {
        // ELEMENT_NODE
        for (const attribute of Array.from(node.attributes)) {
          if (/^on/i.test(attribute.nodeName)) {
            outgoingRelations.push({
              type: 'SvgInlineEventHandler',
              attributeName: attribute.nodeName,
              to: {
                type: 'JavaScript',
                isExternalizable: false,
                text: `function bogus() {${attribute.nodeValue}}`
              },
              node
            });
          }
        }
        const nodeName = node.nodeName.toLowerCase();
        if (nodeName === 'script') {
          const type = node.getAttribute('type');
          if (!type || type === 'text/javascript') {
            href = null;
            isXlink = null;
            if (node.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
              href = node.getAttributeNS(
                'http://www.w3.org/1999/xlink',
                'href'
              );
              isXlink = true;
            } else if (node.hasAttribute('href')) {
              href = node.getAttribute('href');
              isXlink = false;
            }
            if (typeof href === 'string') {
              outgoingRelations.push({
                type: 'SvgScript',
                isXlink,
                href,
                node
              });
            } else {
              outgoingRelations.push({
                type: 'SvgScript',
                to: {
                  type: 'JavaScript',
                  text: node.firstChild ? node.firstChild.nodeValue : ''
                },
                node
              });
            }
          }
        } else if (nodeName === 'style') {
          outgoingRelations.push({
            type: 'SvgStyle',
            to: {
              type: 'Css',
              text: node.firstChild ? node.firstChild.nodeValue : ''
            },
            node
          });
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
            outgoingRelations.push({
              type: 'SvgImage',
              isXlink,
              href,
              node
            });
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
            outgoingRelations.push({
              type: 'SvgAnchor',
              isXlink,
              href,
              node
            });
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
            outgoingRelations.push({
              type: 'SvgPattern',
              isXlink,
              href,
              node
            });
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
            outgoingRelations.push({
              type: 'SvgUse',
              isXlink,
              href,
              node
            });
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
            outgoingRelations.push({
              type: 'SvgFontFaceUri',
              isXlink,
              href,
              node
            });
          }
        }
        if (node.hasAttribute('style')) {
          outgoingRelations.push({
            type: 'SvgStyleAttribute',
            to: {
              type: 'Css',
              isExternalizable: false,
              text: `bogusselector {${node.getAttribute('style')}}`
            },
            node
          });
        }
      }
    }
    return outgoingRelations;
  }
}

Object.assign(Svg.prototype, {
  contentType: 'image/svg+xml',

  isImage: true,

  supportedExtensions: ['.svg']
});

module.exports = Svg;

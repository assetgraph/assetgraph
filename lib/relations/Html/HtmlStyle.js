const HtmlRelation = require('../HtmlRelation');

class HtmlStyle extends HtmlRelation {
  static getRelationsFromNode(node, asset) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('style, link[rel~=stylesheet]')
    ) {
      if (node.nodeName.toLowerCase() === 'style') {
        return {
          type: 'HtmlStyle',
          to: {
            type: 'Css',
            sourceMap: asset._createSourceMapForInlineScriptOrStylesheet(node),
            text: node.firstChild ? node.firstChild.nodeValue : ''
          },
          node
        };
      } else {
        return {
          type: 'HtmlStyle',
          href: node.getAttribute('href'),
          node
        };
      }
    }
  }

  get href() {
    if (this.node.nodeName.toLowerCase() === 'link') {
      return this.node.getAttribute('href');
    }
  }

  set href(href) {
    if (this.node.nodeName.toLowerCase() === 'link') {
      this.node.setAttribute('href', href);
    } else {
      const document = this.node.ownerDocument;
      const link = document.createElement('link');
      for (const attribute of Array.from(this.node.attributes)) {
        if (attribute.name !== 'type') {
          link.setAttribute(attribute.name, attribute.value);
        }
      }
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', href);
      this.node.parentNode.replaceChild(link, this.node);
      this.node = link;
    }
  }

  get media() {
    if (this.node) {
      const media = this.node.getAttribute('media');
      if (media) {
        return media.trim();
      }
    } else {
      return this._media;
    }
  }

  set media(media) {
    if (this.node) {
      if (media) {
        this.node.setAttribute('media', media.trim());
        this.from.markDirty();
      } else if (this.node.hasAttribute('media')) {
        this.from.markDirty();
        this.node.removeAttribute('media');
      }
    } else {
      this._media = media;
    }
  }

  inlineHtmlRelation() {
    if (this.node.nodeName.toLowerCase() === 'style') {
      while (this.node.firstChild) {
        this.node.removeChild(this.node.firstChild);
      }
      this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
    } else {
      const style = this.from.parseTree.createElement('style');
      for (const attribute of Array.from(this.node.attributes)) {
        if (
          attribute.name !== 'type' &&
          attribute.name !== 'href' &&
          attribute.name !== 'rel'
        ) {
          style.setAttribute(attribute.name, attribute.value);
        }
      }

      style.appendChild(this.from.parseTree.createTextNode(this.to.text));
      this.node.parentNode.replaceChild(style, this.node);
      this.node = style;
    }
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    const parseTree = this.from.parseTree;

    if (this.to.isInline) {
      this.node = parseTree.createElement('style');
      this.node.appendChild(parseTree.createTextNode(this.to.text));
    } else {
      this.node = parseTree.createElement('link');
      this.node.setAttribute('rel', 'stylesheet');
    }
    if (this._media) {
      this.node.setAttribute('media', this._media);
      this._media = undefined;
    }
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this._media = this.media;
    super.detach();
  }
}

HtmlStyle.prototype.preferredPosition = 'lastInHead';

HtmlStyle.prototype.targetType = 'Css';

module.exports = HtmlStyle;

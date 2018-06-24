const DOMParser = require('xmldom').DOMParser;
const errors = require('../errors');
const Text = require('./Text');

class Xml extends Text {
  get parseTree() {
    if (!this._parseTree) {
      let firstParseError;
      const domParser = new DOMParser({
        errorHandler(err) {
          if (Object.prototype.toString.call(err) !== '[object Error]') {
            err = new Error(err);
          }
          firstParseError = firstParseError || err;
        }
      });
      const document = domParser.parseFromString(this.text, 'text/xml');

      if (firstParseError) {
        const err = new errors.ParseError({
          message: `Parse error in ${this.urlOrDescription}\n${
            firstParseError.message
          }`,
          asset: this
        });
        if (this.assetGraph) {
          this.assetGraph.warn(err);
        } else {
          throw err;
        }
      }
      if (document) {
        // Workaround for https://github.com/jindw/xmldom/pull/59
        const fixUpDocTypeNode = doctypeNode => {
          if (!doctypeNode || doctypeNode.nodeType !== 10) {
            return;
          }
          for (const doctypePropertyName of ['publicId', 'systemId']) {
            if (doctypeNode[doctypePropertyName]) {
              doctypeNode[doctypePropertyName] = doctypeNode[
                doctypePropertyName
              ].replace(/"/g, '');
            }
          }
        };
        fixUpDocTypeNode(document.doctype);
        for (const childNode of Array.from(document.childNodes)) {
          fixUpDocTypeNode(childNode);
        }
        this._parseTree = document;
      }
    }
    return this._parseTree;
  }

  set parseTree(parseTree) {
    this.unload();
    this._parseTree = parseTree;
    this._lastKnownByteLength = undefined;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  get text() {
    if (typeof this._text !== 'string') {
      if (this._parseTree) {
        this._text = this._parseTree.toString();
      } else {
        this._text = this._getTextFromRawSrc();
      }
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  findOutgoingRelationsInParseTree() {
    const outgoingRelations = super.findOutgoingRelationsInParseTree();
    if (!this.isLoaded) {
      return outgoingRelations;
    }
    const queue = [this.parseTree];
    while (queue.length > 0) {
      const node = queue.shift();
      if (node.childNodes) {
        for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
          queue.unshift(node.childNodes[i]);
        }
      }
      if (node.nodeType === 7) {
        // PROCESSING_INSTRUCTION_NODE
        if (node.tagName === 'xml-stylesheet') {
          const matchData = node.data.match(/href="([^"]*)"/);
          if (matchData) {
            outgoingRelations.push({
              type: 'XmlStylesheet',
              node,
              href: matchData[1].replace(/&quot;/, '"').replace(/&amp;/, '&')
            });
          }
        }
      }
    }
    return outgoingRelations;
  }

  minify() {
    const queue = [this.parseTree];
    while (queue.length > 0) {
      const element = queue.shift();
      // Whitespace-only text node?
      if (element.nodeType === 3 && /^[\r\n\s\t]*$/.test(element.nodeValue)) {
        element.parentNode.removeChild(element);
      }
    }
    this.isPretty = false;
    return this;
  }

  prettyPrint() {
    this.isPretty = true;
    /*eslint-disable*/
        const parseTree = this.parseTree; // So markDirty removes this._text
        /*eslint-enable*/
    this.markDirty();
    return this;
  }
}

Object.assign(Xml.prototype, {
  contentType: 'text/xml',

  supportedExtensions: ['.xml'],

  isPretty: false
});

module.exports = Xml;

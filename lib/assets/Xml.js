const JSDOM = require('jsdom').JSDOM;
const Text = require('./Text');

class Xml extends Text {
  get parseTree() {
    if (!this._parseTree) {
      const text = this.text;
      const matchXmlDeclaration = text.match(/^<\?[^?>]*?\?>\s*/);
      if (matchXmlDeclaration) {
        this.xmlDeclaration = matchXmlDeclaration[0];
      } else {
        this.xmlDeclaration = '';
      }
      try {
        this._jsdom = new JSDOM(text, {
          url: this.url ? this.url : undefined, // So that errors get reported with the url (awaiting https://github.com/jsdom/jsdom/pull/2630)
          contentType: 'application/xhtml+xml'
        });
      } catch (err) {
        if (err.message.includes('unbound namespace prefix')) {
          const [_, lineNumber, charNumber, namespace] = err.message.match(
            /(\d+):(\d+): unbound namespace prefix: "([^"]+)"/
          );

          const lines = this.text.split('\n');
          const fixLine = lines[lineNumber - 1];
          lines[lineNumber - 1] = `${fixLine.slice(
            0,
            charNumber - 1
          )} xmlns:${namespace}="http://fakenamespace.nonstandard"${fixLine.slice(
            charNumber - 1
          )}`;
          this._text = lines.join('\n');

          if (this.assetGraph) {
            const recoveryError = new Error(
              `Inserted missing xml namespace: ${namespace}`
            );
            recoveryError.asset = this;
            this.assetGraph.info(recoveryError);
          }

          return this.parseTree;
        }

        err.asset = this;
        if (this.assetGraph) {
          this.assetGraph.warn(err);
        } else {
          throw err;
        }
        this._jsdom = new JSDOM('<?xml version="1.0"?><root/>', {
          url: this.url ? this.url : undefined, // So that errors get reported with the url (awaiting https://github.com/jsdom/jsdom/pull/2630)
          contentType: 'application/xhtml+xml'
        });
      }
      this._parseTree = this._jsdom.window.document;
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
        this._text = `${this.xmlDeclaration}${this._jsdom.serialize()}`;
      } else {
        this._text = this._getTextFromRawSrc();
      }
    }
    return this._text;
  }

  set text(text) {
    super.text = text;
  }

  unload() {
    super.unload();
    if (this._jsdom) {
      this._jsdom.window.close();
      this._jsdom = undefined;
    }
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
        if (node.nodeName === 'xml-stylesheet') {
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
    // eslint-disable-next-line no-unused-expressions
    this.parseTree; // So markDirty removes this._text
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

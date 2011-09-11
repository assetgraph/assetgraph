var util = require('util'),
    _ = require('underscore'),
    jsdom = require('jsdom'),
    domtohtml = require('jsdom/lib/jsdom/browser/domtohtml'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function Xml(config) {
    Text.call(this, config);
}

util.inherits(Xml, Text);

extendWithGettersAndSetters(Xml.prototype, {
    contentType: 'text/xml',

    defaultExtension: '.xml',

    isPretty: false,

    get parseTree() {
        if (!this._parseTree) {
            this._parseTree = jsdom.jsdom(this.text, undefined, {features: {ProcessExternalResources: [], FetchExternalResources: []}});
            // Jsdom (or its Xml parser) doesn't strip the newline after the <!DOCTYPE> for some reason.
            // Issue reported here: https://github.com/tmpvar/jsdom/issues/160
            if (this._parseTree.firstChild && this._parseTree.firstChild.nodeName === '#text' && this._parseTree.firstChild.nodeValue === "\n") {
                this._parseTree.removeChild(this._parseTree.firstChild);
            }
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this._parseTree = parseTree;
        delete this._rawSrc;
        delete this._text;
        this.markDirty();
    },

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                this._text = (parseTree.doctype ? parseTree.doctype + "\n" : "") + domtohtml.domToHtml(parseTree, !this.isPretty);
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
    },

    minify: function () {
        var q = [this.parseTree];
        while (q.length) {
            var element = q.shift();
            // Whitespace-only text node?
            if (element.nodeType === 3 && /^[\r\n\s\t]*$/.test(element.nodeValue)) {
                element.parentNode.removeChild(element);
            }
        }
        this.isPretty = false;
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
        return this;
    }
});

module.exports = Xml;

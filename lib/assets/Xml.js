var util = require('util'),
    DOMParser = require('xmldom').DOMParser,
    errors = require('../errors'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../'),
    Text = require('./Text');

function Xml(config) {
    Text.call(this, config);
}

util.inherits(Xml, Text);

extendWithGettersAndSetters(Xml.prototype, {
    contentType: 'text/xml',

    supportedExtensions: ['.xml'],

    isPretty: false,

    get parseTree() {
        if (!this._parseTree) {
            var firstParseError,
                domParser = new DOMParser({
                    errorHandler: function (err) {
                        if (Object.prototype.toString.call(err) !== '[object Error]') {
                            err = new Error(err);
                        }
                        firstParseError = firstParseError || err;
                    }
                }),
                document = domParser.parseFromString(this.text, 'text/xml');

            if (firstParseError) {
                var err = new errors.ParseError({message: 'Parse error in ' + this.urlOrDescription + '\n' + firstParseError.message, asset: this});
                if (this.assetGraph) {
                    this.assetGraph.emit('warn', err);
                } else {
                    throw err;
                }
            }
            if (document) {
                // Workaround for https://github.com/jindw/xmldom/pull/59
                var fixUpDocTypeNode = function (doctypeNode) {
                    if (!doctypeNode || doctypeNode.nodeType !== 10) {
                        return;
                    }
                    ['publicId', 'systemId'].forEach(function (doctypePropertyName) {
                        if (doctypeNode[doctypePropertyName]) {
                            doctypeNode[doctypePropertyName] = doctypeNode[doctypePropertyName].replace(/"/g, '');
                        }
                    });
                };
                fixUpDocTypeNode(document.doctype);
                for (var i = 0 ; i < document.childNodes.length ; i += 1) {
                    fixUpDocTypeNode(document.childNodes[i]);
                }
                this._parseTree = document;
            }
        }
        return this._parseTree;
    },

    _isRelationUrl: function (url) {
        return url && !/^mailto:|^\s*$|^#/i.test(url);
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this),
            queue = [this.parseTree];
        while (queue.length) {
            var node = queue.shift();
            if (node.childNodes) {
                for (var i = node.childNodes.length - 1 ; i >= 0 ; i -= 1) {
                    queue.unshift(node.childNodes[i]);
                }
            }
            if (node.nodeType === 7) { // PROCESSING_INSTRUCTION_NODE
                if (node.tagName === 'xml-stylesheet') {
                    var matchData = node.data.match(/href="([^"]*)"/);
                    if (matchData) {
                        var outgoingRelation = new AssetGraph.XmlStylesheet({
                                from: this,
                                node: node
                            });
                        outgoingRelation.to = {url: outgoingRelation.href};
                        outgoingRelations.push(outgoingRelation);
                    }
                }
            }
        }
        return outgoingRelations;
    },

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this.markDirty();
    },

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                this._text = this._parseTree.toString();
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
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
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    }
});

// Grrr...
Xml.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

module.exports = Xml;

var util = require('util'),
    _ = require('underscore'),
    errors = require('../errors'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text'),
    AssetGraph = require('../');

function SrcSet(config) {
    Text.call(this, config);
    if (!this._parseTree && !('_text' in this)) {
        throw new Error('SrcSet: Either parseTree or text must be specified');
    }
}

util.inherits(SrcSet, Text);

extendWithGettersAndSetters(SrcSet.prototype, {
    type: 'SrcSet',

    contentType: null, // Avoid reregistering application/octet-stream

    supportedExtensions: [],

    get parseTree() {
        if (!this._parseTree) {
            this._parseTree = [];
            this.text.split(/,/).forEach(function (entryStr) {
                entryStr = entryStr.replace(/^\s+|\s+$/g, '');
                var matchEntryStr = entryStr.match(/^([^\s]+)(.*)$/);
                if (matchEntryStr) {
                    var extraTokens = matchEntryStr[2].split(/\s+/).filter(function (extraToken) {
                        return !/^\s*$/.test(extraToken);
                    });
                    this._parseTree.push({
                        href: matchEntryStr[1],
                        extraTokens: extraTokens
                    });
                } else {
                    var warning = new errors.SyntaxError({message: 'SrcSet: Could not parse entry: ' + entry, asset: this});
                    if (this.assetGraph) {
                        this.assetGraph.emit('warn', warning);
                    } else {
                        console.warn(this.toString() + ': ' + warning.message);
                    }
                }
            }, this);
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this.markDirty();
    },

    get text() {
        if (!('_text' in this)) {
            // We're in trouble if neither this._text, nor this._parseTree is found.
            this._text = this.parseTree.map(function (node) {
                return node.href + (node.extraTokens.length > 0 ? ' ' + node.extraTokens.join(' ') : '');
            }).join(', ');
        }
        return this._text;
    },

    findOutgoingRelationsInParseTree: function () {
        return this.parseTree.map(function (node) {
            return new AssetGraph.SrcSetEntry({
                from: this,
                node: node,
                to: {
                    url: node.href
                }
            });
        }, this);
    }
});

module.exports = SrcSet;

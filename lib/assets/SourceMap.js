var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../'),
    errors = require('../errors'),
    sourceMap = require('source-map'),
    Text = require('./Text');

function SourceMap(config) {
    Text.call(this, config);
}

util.inherits(SourceMap, Text);

extendWithGettersAndSetters(SourceMap.prototype, {
    contentType: null, // Avoid reregistering application/json

    supportedExtensions: ['.map'],

    get parseTree() {
        if (!this._parseTree) {
            var obj;
            try {
                obj = JSON.parse(this.text.replace(/^\)\]\}/, '')); // Ignore leading )]} (allowed by the source map spec)
            } catch (e) {
                var err = new errors.ParseError({message: 'Json parse error in ' + (this.url || '(inline)') + ': ' + e.message, asset: this});
                if (this.assetGraph) {
                    this.assetGraph.emit('warn', err);
                } else {
                    throw err;
                }
            }
            if (obj) {
                this._parseTree = new sourceMap.SourceMapConsumer(obj);
            }
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
            if (this._parseTree) {
                var obj = this._parseTree.toJSON();
                if (this.isPretty) {
                    this._text = JSON.stringify(obj, undefined, '    ') + '\n';
                } else {
                    this._text = JSON.stringify(obj);
                }
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    findOutgoingRelationsInParseTree: function () {
        var parseTree = this.parseTree,
            outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this);
        if (parseTree.file) {
            outgoingRelations.push(new AssetGraph.SourceMapFile({
                from: this,
                to: {
                    url: parseTree.file
                }
            }));
        }
        if (Array.isArray(parseTree.sources)) {
            parseTree.sources.forEach(function (sourceUrl, i) {
                outgoingRelations.push(new AssetGraph.SourceMapSource({
                    from: this,
                    index: i, // This isn't too robust
                    to: {
                        url: sourceUrl
                    }
                }));
            }, this);
        }
        return outgoingRelations;
    }
});

module.exports = SourceMap;

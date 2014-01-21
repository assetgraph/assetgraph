var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../'),
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
            try {
                var obj = JSON.parse(this.text.replace(/^\)\]\}/, '')); // Ignore leading )]} (allowed by the source map spec)
            } catch (e) {
                var err = new errors.ParseError({message: 'Json parse error in ' + (this.url || '(inline)') + ': ' + e.message, asset: this});
                if (this.assetGraph) {
                    this.assetGraph.emit('error', err);
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

    findOutgoingRelationsInParseTree: function () {
        var parseTree = this.parseTree,
            outgoingRelations = [];
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

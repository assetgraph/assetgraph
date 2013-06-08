var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../AssetGraph'),
    Json = require('./Json');

function SourceMap(config) {
    Json.call(this, config);
}

util.inherits(SourceMap, Json);

extendWithGettersAndSetters(SourceMap.prototype, {
    contentType: null, // Avoid reregistering application/json

    supportedExtensions: ['.map'],

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

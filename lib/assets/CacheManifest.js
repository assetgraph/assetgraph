var util = require('util'),
    _ = require('underscore'),
    error = require('../util/error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    relations = require('../relations'),
    Text = require('./Text');

function CacheManifest(config) {
    Text.call(this, config);
}

util.inherits(CacheManifest, Text);

_.extend(CacheManifest.prototype, {
    contentType: 'text/cache-manifest',

    defaultExtension: 'appcache',

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(error.passToFunction(cb, function (decodedSrc) {
            var currentSectionName = 'CACHE',
                parseTree = {};
            decodedSrc.split(/\r?\n|\n?\r/).forEach(function (line, i) {
                if (i === 0) {
                    if (line === 'CACHE MANIFEST') {
                        return; // Skip
                    } else {
                        console.log("Warning: First line of cache manifest wasn't CACHE MANIFEST");
                    }
                }
                var matchNewSection = line.match(/^(CACHE|NETWORK|FALLBACK):\s*$/);
                if (matchNewSection) {
                    currentSectionName = matchNewSection[1];
                } else if (!/^\s*($|\#)/.test(line)) {
                    var tokens = line.replace(/^\s+|\s+$/g).split(" "), // Trim just in case
                        node;
                    if (tokens.length === (currentSectionName === 'FALLBACK' ? 2 : 1)) {
                        if (!(currentSectionName in parseTree)) {
                            parseTree[currentSectionName] = [];
                        }
                        parseTree[currentSectionName].push({
                            tokens: tokens
                        });
                    } else {
                        console.log("CacheManifest.getParseTree: Skipped illegal line in " + currentSectionName + " section: " + line);
                    }
                }
            });
            cb(null, parseTree);
        }));
    }),

    getText: function (cb) {
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var src = "CACHE MANIFEST\n";

            function getSectionText(nodes) {
                return nodes.map(function (node) {
                    return node.tokens.join(" ");
                }).join("\n") + "\n";
            }

            // The heading for the CACHE section can be omitted if it's the first thing in the manifest,
            // so put it first if there is one.
            if (parseTree.CACHE) {
                src += getSectionText(parseTree.CACHE);
            }
            _.each(parseTree, function (nodes, sectionName) {
                if (sectionName !== 'CACHE' && nodes.length) {
                    src += sectionName + ":\n" + getSectionText(nodes);
                }
            });
            cb(null, src);
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            _.each(parseTree, function (nodes, sectionName) {
                if (sectionName !== 'NETWORK') {
                    nodes.forEach(function (node) {
                        // In the CACHE section there's only one token per entry, in FALLBACK
                        // there's the online URL followed by the offline URL (the one we want).
                        // Just pick the last token as the url.
                        originalRelations.push(new relations.CacheManifestEntry({
                            from: that,
                            node: node,
                            sectionName: sectionName,
                            to: node.tokens[node.tokens.length - 1]
                        }));
                    });
                }
            });
            cb(null, originalRelations);
        }));
    }),

    // The order of the entries is insignificant in a cache manifest, ignore position and adjacentRelation args
    attachRelation: function (relation) {
        if (!relation.sectionName) {
            relation.sectionName = 'CACHE';
        }
        // FIXME: Doesn't work with FALLBACK entries where there're two tokens.
        _.extend(relation, {
            from: this,
            node: {
                tokens: [relation.to.url] // Seems wrong
            }
        });
        if (!(relation.sectionName in this.parseTree)) {
            this.parseTree[relation.sectionName] = [];
        }
        this.parseTree[relation.sectionName].push(relation.node);
    },

    detachRelation: function (relation) {
        var i = this.parseTree[relation.sectionName].indexOf(relation.node);
        if (i === -1) {
            throw new Error("CacheManifest.detachRelation: Relation " + relation + " not found");
        } else {
            this.parseTree[relation.sectionName].splice(i, 1);
        }
    }
});

module.exports = CacheManifest;

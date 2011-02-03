var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    relations = require('../relations'),
    Base = require('./Base').Base;

function CacheManifest(config) {
    Base.call(this, config);
}

util.inherits(CacheManifest, Base);

_.extend(CacheManifest.prototype, {
    contentType: 'text/cache-manifest',

    defaultExtension: 'manifest',

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            var currentSection = 'CACHE',
                parseTree = {};
            src.split(/\r?\n|\n?\r/).forEach(function (line, i) {
                if (i === 0) {
                    if (line === 'CACHE MANIFEST') {
                        return; // Skip
                    } else {
                        console.log("Warning: First line of cache manifest wasn't CACHE MANIFEST");
                    }
                }
                var matchNewSection = line.match(/^(CACHE|NETWORK|FALLBACK):\s*$/);
                if (matchNewSection) {
                    currentSection = matchNewSection[1];
                } else if (!/^\s*($|\#)/.test(line)) {
                    if (!(currentSection in parseTree)) {
                        parseTree[currentSection] = [];
                    }
                    parseTree[currentSection].push({
                        url: line.replace(/^\s+|\s+$/g) // Trim just in case
                    });
                }
            });
            cb(null, parseTree);
        }));
    }),

    serialize: function (cb) {
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var src = "CACHE MANIFEST\n";
            // The heading for the CACHE section can be omitted if it's the first thing in the manifest,
            // so put it first if there is one.
            if (parseTree.CACHE) {
                src += _.pluck(parseTree.CACHE, 'url').join("\n") + "\n";
            }
            _.each(parseTree, function (nodes, sectionName) {
                if (sectionName !== 'CACHE' && nodes.length) {
                    src += sectionName + ":\n" + _.pluck(nodes, 'url').join("\n") + "\n";
                }
            });
            cb(null, src);
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            if ('CACHE' in parseTree) {
                parseTree.CACHE.forEach(function (node) {
                    originalRelations.push(new relations.CacheManifestEntry({
                        from: that,
                        node: node,
                        assetConfig: node.url
                    }));
                });
            }
            cb(null, originalRelations);
        }));
    }),

    attachRelation: function (relation) { // The order is insignificant, ignore position and adjacentRelation args
        _.extend(relation, {
            from: this,
            node: {
                url: relation.to.url // Seems wrong
            }
        });
        if (!('CACHE' in this.parseTree)) {
            this.parseTree.CACHE = [];
        }
        this.parseTree.CACHE.push(relation.node);
    },

    detachRelation: function (relation) {
        var i = this.parseTree.CACHE.indexOf(relation.node);
        if (i === -1) {
            throw new Error("CacheManifest.detachRelation: Relation " + relation + " not found");
        } else {
            this.parseTree.CACHE.splice(i, 1);
        }
        this.parentNode.splice(this.parentNode.indexOf(this.node));
    }
});

exports.CacheManifest = CacheManifest;

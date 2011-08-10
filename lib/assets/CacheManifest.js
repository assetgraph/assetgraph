var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    relations = require('../relations'),
    Text = require('./Text');

function CacheManifest(config) {
    Text.call(this, config);
}

util.inherits(CacheManifest, Text);

extendWithGettersAndSetters(CacheManifest.prototype, {
    contentType: 'text/cache-manifest',

    defaultExtension: '.appcache',

    get parseTree() {
        if (!this._parseTree) {
            var parseTree = {},
                currentSectionName = 'CACHE';
            this.text.split(/\r?\n|\n?\r/).forEach(function (line, i) {
                if (i === 0) {
                    if (line === 'CACHE MANIFEST') {
                        return; // Skip
                    } else {
                        console.warn("Warning: First line of cache manifest wasn't CACHE MANIFEST");
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
                        console.warn("CacheManifest.parseTree getter: Parse error in section " + currentSectionName + ", line " + i + ": " + line);
                    }
                }
            }, this);
            this._parseTree = parseTree;
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
        if (!this._text) {
            if (this._parseTree) {
                this.emit('serialize', this);
                this._text = "CACHE MANIFEST\n";

                function getSectionText(nodes) {
                    return nodes.map(function (node) {
                        return node.tokens.join(" ");
                    }).join("\n") + "\n";
                }

                // The heading for the CACHE section can be omitted if it's the first thing in the manifest,
                // so put it first if there is one.
                if (this._parseTree.CACHE) {
                    this._text += getSectionText(this._parseTree.CACHE);
                }
                _.each(this._parseTree, function (nodes, sectionName) {
                    if (sectionName !== 'CACHE' && nodes.length) {
                        this._text += sectionName + ":\n" + getSectionText(nodes);
                    }
                }, this);
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
        this.markDirty();
    },

    get outgoingRelations() {
        if (!this._outgoingRelations) {
            this._outgoingRelations = [];
            // Traverse the sections in alphabetical order so the order of the relations is predictable
            Object.keys(this.parseTree).sort().forEach(function (sectionName) {
                var nodes = this.parseTree[sectionName];
                if (sectionName !== 'NETWORK') {
                    nodes.forEach(function (node) {
                        // In the CACHE section there's only one token per entry, in FALLBACK
                        // there's the online URL followed by the offline URL (the one we want).
                        // Just pick the last token as the url.
                        this._outgoingRelations.push(new relations.CacheManifestEntry({
                            from: this,
                            to: node.tokens[node.tokens.length - 1],
                            node: node,
                            sectionName: sectionName
                        }));
                    }, this);
                }
            }, this);
        }
        return this._outgoingRelations;
    },

    attachRelation: function (relation, position, adjacentRelation) {
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

        Text.prototype.attachRelation.call(this, relation, position, adjacentRelation);
    },

    detachRelation: function (relation) {
        var indexInSection = this.parseTree[relation.sectionName].indexOf(relation.node);
        if (indexInSection === -1 || indexInOutgoingRelations === -1) {
            throw new Error("CacheManifest.detachRelation: Relation " + relation + " not found in the " + relation.sectionName + " section");
        }
        this.parseTree[relation.sectionName].splice(indexInSection, 1);

        Text.prototype.detachRelation.call(this, relation);
    }
});

module.exports = CacheManifest;

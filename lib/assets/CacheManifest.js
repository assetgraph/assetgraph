var util = require('util'),
    _ = require('underscore'),
    errors = require('../errors'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Text = require('./Text');

function CacheManifest(config) {
    Text.call(this, config);
}

util.inherits(CacheManifest, Text);

extendWithGettersAndSetters(CacheManifest.prototype, {
    contentType: 'text/cache-manifest',

    supportedExtensions: ['.appcache'],

    get parseTree() {
        if (!this._parseTree) {
            var parseTree = {},
                syntaxErrors = [],
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
                } else if (!/^\s*$/.test(line)) {
                    if (!(currentSectionName in parseTree)) {
                        parseTree[currentSectionName] = [];
                    }
                    if (/^\s*#/.test(line)) {
                        parseTree[currentSectionName].push({
                            comment: line.replace(/^\s*#/, "")
                        });
                    } else {
                        var tokens = line.replace(/^\s+|\s+$/g).split(" "), // Trim just in case
                            node;
                        if (tokens.length === (currentSectionName === 'FALLBACK' ? 2 : 1)) {
                            parseTree[currentSectionName].push({
                                tokens: tokens
                            });
                        } else {
                            syntaxErrors.push(new errors.SyntaxError({
                                message: 'CacheManifest.parseTree getter: Parse error in section ' + currentSectionName + ', line ' + i + ': ' + line,
                                line: i
                            }));
                        }
                    }
                }
            }, this);
            if (syntaxErrors.length > 0) {
                if (this.assetGraph) {
                    syntaxErrors.forEach(function (syntaxError) {
                        this.assetGraph.emit('error', syntaxError);
                    }, this);
                } else {
                    throw new Error(_.pluck(syntaxErrors, 'message').join("\n"));
                }
            }
            this._parseTree = parseTree;
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
                this._text = "CACHE MANIFEST\n";

                function getSectionText(nodes) {
                    return nodes.map(function (node) {
                        if ('comment' in node) {
                            return "#" + node.comment;
                        } else {
                            return node.tokens.join(" ");
                        }
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

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [];
        // Traverse the sections in alphabetical order so the order of the relations is predictable
        Object.keys(this.parseTree).sort().forEach(function (sectionName) {
            var nodes = this.parseTree[sectionName];
            if (sectionName !== 'NETWORK') {
                nodes.forEach(function (node) {
                    if (node.tokens) {
                        // In the CACHE section there's only one token per entry, in FALLBACK
                        // there's the online URL followed by the offline URL (the one we want).
                        // Just pick the last token as the url.
                        outgoingRelations.push(new AssetGraph.CacheManifestEntry({
                            from: this,
                            to: {
                                url: node.tokens[node.tokens.length - 1]
                            },
                            node: node,
                            sectionName: sectionName
                        }));
                    }
                }, this);
            }
        }, this);
        return outgoingRelations;
    }
});

// Grrr...
CacheManifest.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

module.exports = CacheManifest;

// FIXME
global.Promise = require('rsvp').Promise;

var util = require('util'),
    _ = require('lodash'),
    postcss = require('postcss'),
    cssnano = require('cssnano'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    perfectionist = require('perfectionist'),
    errors = require('../errors'),
    Text = require('./Text'),
    propertyWithImageUrlRegExp = /^(?:content|_?cursor|_?background(?:-image)?|(?:-[a-z]+-)?(?:border-image(?:-source)?|mask|mask-image|mask-image-source|mask-box-image|mask-box-image-source)|(?:\+|-webkit-)?filter)$/;

function Css(config) {
    Text.call(this, config);
}

module.exports = Css;

var AssetGraph = require('../');

util.inherits(Css, Text);

function extractEncodingFromText(text) {
    var matchCharset = text.match(/@charset\s*([\'\"])\s*([\w\-]+)\s*\1/mi);
    return matchCharset && matchCharset[2]; // Will be undefined in case of no match
}

extendWithGettersAndSetters(Css.prototype, {
    contentType: 'text/css',

    supportedExtensions: ['.css'],

    get encoding() {
        if (!this._encoding) {
            if (typeof this._text === 'string') {
                this._encoding = extractEncodingFromText(this._text) || this.defaultEncoding;
            } else if (this._rawSrc) {
                this._encoding = extractEncodingFromText(this._rawSrc.toString('binary', 0, Math.min(1024, this._rawSrc.length))) || this.defaultEncoding;
            } else {
                this._encoding = this.defaultEncoding;
            }
        }
        return this._encoding;
    },

    set encoding(encoding) {
        if (encoding !== this.encoding) {
            /*jshint ignore:start*/
            var text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
            /*jshint ignore:end*/
            this._rawSrc = undefined;
            this._encoding = encoding;
            this.markDirty();
        }
    },

    _updateText: function (forceUpdateSourceMap) {
        if (!this._parseTree && this._rawSrc) {
            this._text = this._getTextFromRawSrc();
            if (!forceUpdateSourceMap || typeof this._sourceMap !== 'undefined') {
                return;
            }
        }
        var result;
        if (this.isPretty) {
            result = postcss(perfectionist).process(this.parseTree, { map: { inline: false, annotation: false, sourcesContent: true } });
        } else if (this.isMinified) {
            result = postcss(cssnano({
                svgo: false,
                safe: true,
                autoprefixer: false,
                discardComments: {
                    remove: function (comment) {
                        return !(/@preserve|@license|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment);
                    }
                },
            })).process(this.parseTree, { map: { inline: false, annotation: false, sourcesContent: true } });
        } else {
            result = this.parseTree.toResult({ map: { inline: false, annotation: false, sourcesContent: true } });
        }
        this._text = result.root.toString(); // cssnano case?
        this._sourceMap = result.map.toJSON();
    },

    get text() {
        if (typeof this._text !== 'string') {
            this._updateText();
        }
        return this._text;
    },

    get sourceMap() {
        if (typeof this._sourceMap === 'undefined') {
            this._updateText(true);
        }
        if (typeof this._sourceMap === 'string') {
            this._sourceMap = JSON.parse(this._sourceMap);
        }
        return this._sourceMap;
    },

    get parseTree() {
        if (!this._parseTree) {
            // Emulate postcss' PreviousMap class, but take the source from memory:
            // CSSOM gets the @charset declaration mixed up with the first selector:
            var nonInlineAncestor = this.nonInlineAncestor;
            var sourceUrl = this.sourceUrl || (nonInlineAncestor && nonInlineAncestor.url) || this.url || 'standalone-' + this.id + '.js';
            try {
                this._parseTree = postcss.parse(this.text, {
                    // TODO: jsdom 6.4.0+ supports jsdom.nodeLocation, which might help us map this
                    // inline stylesheets correctly to the .html source in the generated source map.
                    source: sourceUrl,
                    from: sourceUrl,
                    map: this._sourceMap && this._sourceMap.mappings && { prev: this._sourceMap }
                });
                this._parseTree.source.input.file = sourceUrl;
                if (this._parseTree.source.input.map) {
                    this._parseTree.source.input.map.file = sourceUrl;
                }
            } catch (e) {
                // TODO: Consider using https://github.com/postcss/postcss-safe-parser
                var err = new errors.ParseError({
                    message: 'Parse error in ' + this.urlOrDescription +
                        '(line ' + e.line + ', column ' + e.column + '):\n' + e.message +
                        (e.styleSheet ? '\nFalling back to using the ' + e.styleSheet.cssRules.length + ' parsed CSS rules' : ''),
                    styleSheet: e.styleSheet,
                    line: e.line,
                    column: e.column,
                    asset: this
                });
                if (this.assetGraph) {
                    if (err.styleSheet) {
                        this._parseTree = err.styleSheet;
                    } else {
                        this._parseTree = postcss.parse(''); // Hmm, FIXME
                    }
                    this.assetGraph.emit('warn', err);
                } else {
                    throw err;
                }
            }
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this.markDirty();
    },

    _cloneParseTree: function () {
        // Waiting for https://github.com/postcss/postcss/issues/364
        function cloneWithRaws(node) {
            if (node.nodes) {
                var oldNodes = node.nodes;
                node.nodes = [];
                var clone = node.clone({ raws: node.raws });
                node.nodes = oldNodes;
                oldNodes.map(cloneWithRaws).forEach(function (clonedChild) {
                    clone.append(clonedChild);
                });
                return clone;
            } else {
                return node.clone({ raws: node.raws });
            }
        }

        return cloneWithRaws(this._parseTree);
    },

    set sourceMap(sourceMap) {
        this._sourceMap = sourceMap;
        // postcss doesn't support { mappings: '' }, so don't bother passing empty source maps:
        // Waiting for https://github.com/postcss/postcss/pull/636
        if (typeof this._parseTree !== 'undefined' && sourceMap.mappings) {
            _.extend(this._parseTree.source.input, postcss.parse('', { map: { prev: sourceMap } }).source.input);
        }
    },

    get isEmpty() {
        return this.parseTree.nodes.length === 0;
    },

    minify: function () {
        this.isPretty = false;
        this.isMinified = true;
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        this.isMinified = false;
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this);
        var that = this;
        this.eachRuleInParseTree(function (node, parentRuleOrStylesheet) {
            if (node.type === 'comment') {
                var matchSourceUrlOrSourceMappingUrl = node.text.match(/[@#]\s*source(Mapping)?URL=([^\s\n]*)/);
                if (matchSourceUrlOrSourceMappingUrl) {
                    if (matchSourceUrlOrSourceMappingUrl[1] === 'Mapping') {
                        outgoingRelations.push(new AssetGraph.CssSourceMappingUrl({
                            from: that,
                            node: node,
                            to: {
                                url: matchSourceUrlOrSourceMappingUrl[2],
                                // Source maps are currently served as application/json, so prevent the target asset
                                // from being loaded as a Json asset:
                                type: 'SourceMap'
                            }
                        }));
                    } else {
                        outgoingRelations.push(new AssetGraph.CssSourceUrl({
                            from: that,
                            node: node,
                            to: {
                                url: matchSourceUrlOrSourceMappingUrl[2]
                            }
                        }));
                    }
                }
            } else if (node.type === 'atrule' && node.name === 'import') {
                outgoingRelations.push(new AssetGraph.CssImport({
                    from: that,
                    to: {
                        url: AssetGraph.CssImport.parse(node.params).url
                    },
                    parentNode: parentRuleOrStylesheet,
                    node: node
                }));
            } else if (node.type === 'atrule' && node.name === 'font-face') {
                node.nodes.forEach(function (childNode) {
                    if (childNode.type === 'decl' && childNode.prop === 'src') {
                        AssetGraph.CssFontFaceSrc.prototype.findUrlsInPropertyValue(childNode.value).forEach(function (url, tokenNumber) {
                            outgoingRelations.push(new AssetGraph.CssFontFaceSrc({
                                from: that,
                                to: {
                                    url: url
                                },
                                tokenNumber: tokenNumber,
                                parentNode: parentRuleOrStylesheet,
                                node: node,
                                propertyNode: childNode
                            }));
                        });
                    }
                });
            } else if (node.type === 'rule') {
                for (var i = 0 ; i < node.nodes.length ; i += 1) {
                    var childNode = node.nodes[i];
                    var propertyName = childNode.prop;
                    var propertyValue = childNode.value;
                    if (propertyWithImageUrlRegExp.test(propertyName)) {
                        AssetGraph.CssImage.prototype.findUrlsInPropertyValue(propertyValue).forEach(function (url, tokenNumber) {
                            if (!/^#/.test(url)) { // Don't model eg. filter: url(#foo);
                                outgoingRelations.push(new AssetGraph.CssImage({
                                    from: this,
                                    to: {
                                        url: url
                                    },
                                    tokenNumber: tokenNumber,
                                    parentNode: parentRuleOrStylesheet,
                                    node: node,
                                    propertyNode: childNode,
                                    propertyName: propertyName
                                }));
                            }
                        }, this);
                    } else if (propertyName === 'behavior') {
                        // Skip behavior properties that have # as the first char in the url so that
                        // stuff like behavior(#default#VML) won't be treated as a relation.
                        var matchUrl = propertyValue.match(/\burl\((\'|\"|)([^#\'\"][^\'\"]*?)\1\)/);
                        if (matchUrl) {
                            outgoingRelations.push(new AssetGraph.CssBehavior({
                                from: this,
                                to: {
                                    url: matchUrl[2]
                                },
                                parentNode: parentRuleOrStylesheet,
                                node: node,
                                propertyNode: childNode,
                                propertyName: propertyName
                            }));
                        }
                    }

                    if (propertyName === 'filter' || propertyName === '-ms-filter') {
                        AssetGraph.CssAlphaImageLoader.prototype.findUrlsInPropertyValue(propertyValue).forEach(function (url, tokenNumber) {
                            outgoingRelations.push(new AssetGraph.CssAlphaImageLoader({
                                from: this,
                                to: {
                                    url: url
                                },
                                tokenNumber: tokenNumber,
                                parentNode: parentRuleOrStylesheet,
                                node: node,
                                propertyNode: childNode,
                                propertyName: propertyName
                            }));
                        }, this);
                    }
                }
            }
        }.bind(this));
        return outgoingRelations;
    }
});

// Grrr...
Css.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

// If lambda returns false, subrules won't be traversed
Css.eachRuleInParseTree = function (ruleOrStylesheet, lambda) {
    ruleOrStylesheet.nodes.forEach(function (node) {
        if (lambda(node, ruleOrStylesheet) !== false && node.nodes) {
            Css.eachRuleInParseTree(node, lambda);
        }
    });
};

Css.prototype.eachRuleInParseTree = function (lambda) {
    return Css.eachRuleInParseTree(this.parseTree, lambda);
};

// Overwrite some methods in the copy of require('source-map').SourceMapGenerator
// that postcss gets to compensate for its mangling of urls. This should be
// fixed in postcss itself instead:

function fixPostcssUrl(url) {
    return url.replace(/^http:\/+/, 'http://').replace(/^file:\/*/, 'file:///');
}

var postcssSourceMap;
try {
    postcssSourceMap = require('postcss/node_modules/source-map');
} catch (e) {
    postcssSourceMap = require('source-map');
}

var originalAddMapping = postcssSourceMap.SourceMapGenerator.prototype.addMapping;
postcssSourceMap.SourceMapGenerator.prototype.addMapping = function (mapping) {
    if (mapping.source) {
        mapping.source = fixPostcssUrl(mapping.source);
    }
    return originalAddMapping.apply(this, arguments);
};

var originalApplySourceMap = postcssSourceMap.SourceMapGenerator.prototype.applySourceMap;
postcssSourceMap.SourceMapGenerator.prototype.applySourceMap = function (sourceMapConsumer, sourceFile, sourceMapPath) {
    if (sourceFile) {
        sourceFile = fixPostcssUrl(sourceFile);
    }
    if (sourceMapPath) {
        sourceMapPath = fixPostcssUrl(sourceMapPath);
    }
    return originalApplySourceMap.call(this, sourceMapConsumer, sourceFile, sourceMapPath);
};

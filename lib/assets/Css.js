// FIXME
global.Promise = require('rsvp').Promise;

var util = require('util'),
    postcss = require('postcss'),
    PreviousMap = require('postcss/lib/previous-map'),
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

    get text() {
        if (typeof this._text !== 'string') {
            if (this._parseTree) {
                if (this.isPretty) {
                    this._text = perfectionist.process(this._parseTree).toString();
                } else if (this.isMinified) {
                    this._text = cssnano({ svgo: false, safe: true }).process(this._parseTree).toString();
                } else {
                    this._text = this._parseTree.toString();
                }
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    get parseTree() {
        if (!this._parseTree) {
            // Emulate postcss' PreviousMap class, but take the source from memory:
            // CSSOM gets the @charset declaration mixed up with the first selector:
            var nonInlineAncestor = this.nonInlineAncestor;
            var sourceUrl = (nonInlineAncestor && nonInlineAncestor.url) || this.url || 'standalone-' + this.id + '.js';
            try {
                this._parseTree = postcss.parse(this.text, {
                    // TODO: jsdom 6.4.0+ supports jsdom.nodeLocation, which might help us map this
                    // inline stylesheets correctly to the .html source in the generated source map.
                    source: sourceUrl,
                    from: sourceUrl,
                    map: { prev: this._sourceMap || { version: 3, sources: [], mappings: true } }
                });
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

    get sourceMap() {
        if (typeof this._sourceMap === 'undefined') {
            // this._sourceMap = escodegen.generate(this.parseTree, _.defaults({ sourceMap: true }, this._getEscodegenOptions()));
            this._sourceMap = this.parseTree.toResult({ map: { inline: false, annotation: false } }).map.toJSON();
            // Fix weird bug in postcss that breaks absolute urls:
            this._sourceMap.sources = this._sourceMap.sources.map(function (sourceUrl) {
                return sourceUrl.replace(/^http:\/*/, 'http://').replace(/^file:\/*/, 'file:///');
            });
        }
        if (typeof this._sourceMap === 'string') {
            this._sourceMap = JSON.parse(this._sourceMap);
        }
        return this._sourceMap;
    },

    set sourceMap(sourceMap) {
        this._sourceMap = sourceMap;
        if (typeof this._parseTree !== 'undefined') {
            this._parseTree.source.input.map = Object.create(PreviousMap.prototype, {
                text: { value: this._sourceMap },
                file: { value: '' }
            });
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
                    // When parsing a property that uses the underscore hack, postcss doesn't include the _ in the property
                    // name, but in the raws.before property. Extract it from there so the rest of this code will detect
                    // the correct relations. The only thing this accomplishes is that the properties that aren't explicitly
                    // recognized by propertyWithImageUrlRegExp WITH a leading underscore won't be modelled as a relation
                    // when they have an underscore. Down the road I think we should align with postcss here and stop
                    // doing anything special for the underscore.
                    // It'll mean the CssImage "test case with a bunch of different CssImage relations" will need to be
                    // altered a bit, because it test that _border-image: url(bar.png); isn't modelled as a relation,
                    // which seems pretty silly. Let's evaluate this when the postcss branch is ready to merge.
                    if (/_$/.test(childNode.raws.before)) {
                        propertyName = '_' + propertyName;
                    }
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
                    } else if (propertyName === 'behavior' || propertyName === '_behavior') {
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

                    if (propertyName === 'filter' || propertyName === '_filter' || propertyName === '-ms-filter') {
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

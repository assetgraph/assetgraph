var util = require('util'),
    _ = require('underscore'),
    cssom = require('cssom-papandreou'),
    cssmin = require('cssmin'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    errors = require('../errors'),
    Text = require('./Text'),
    propertyWithImageUrlRegExp = /^(?:content|_?cursor|_?background(?:-image)?|(?:-[a-z]+-)?(?:border-image(?:-source)?|mask|mask-image|mask-image-source|mask-box-image|mask-box-image-source))$/,
    urlTokenRegExp = /\burl\((\'|\"|)([^\'\"]+?)\1\)/g,
    alphaImageLoaderSrcRegExp = /AlphaImageLoader\([^\)]*src=([\'\"])(.+?)(\1)[^\)]*\)/gi;

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

    isPretty: false,

    get encoding() {
        if (!this._encoding) {
            if ('_text' in this) {
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
            delete this._rawSrc;
            this._encoding = encoding;
            this.markDirty();
        }
    },

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                this._text = this._parseTree.toString();
                if (!this.isPretty) {
                    this._text = cssmin.cssmin(this._text);
                }
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    get parseTree() {
        if (!this._parseTree) {
            // CSSOM gets the @charset declaration mixed up with the first selector:
            try {
                this._parseTree = cssom.parse(this.text.replace(/@charset\s*([\'\"])\s*[\w\-]+\s*\1;/, ''));
            } catch (e) {
                var err = new errors.ParseError({
                    message: 'Parse error in ' + this.urlOrDescription +
                        '(line ' + e.line + ', column ' + e.char + '):\n' + e.message +
                        (e.styleSheet ? '\nFalling back to using the ' + e.styleSheet.cssRules.length + ' parsed CSS rules' : ''),
                    styleSheet: e.styleSheet,
                    line: e.line,
                    column: e.char,
                    asset: this
                });
                if (this.assetGraph) {
                    if (err.styleSheet) {
                        this._parseTree = err.styleSheet;
                    } else {
                        this._parseTree = {cssRules: []};
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

    get isEmpty() {
        return this.parseTree.cssRules.length === 0;
    },

    minify: function () {
        this.isPretty = false;
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [];
        this.eachRuleInParseTree(function (cssRule, parentRuleOrStylesheet) {
            var matchUrlToken,
                tokenNumber = 0;
            if (cssRule.type === cssom.CSSRule.IMPORT_RULE) {
                outgoingRelations.push(new AssetGraph.CssImport({
                    from: this,
                    to: {
                        url: cssRule.href
                    },
                    parentRule: parentRuleOrStylesheet,
                    cssRule: cssRule
                }));
            } else if (cssRule.type === cssom.CSSRule.FONT_FACE_RULE) {
                var src = cssRule.style.getPropertyValue('src');
                if (src) {
                    tokenNumber = 0;
                    urlTokenRegExp.lastIndex = 0; // Just in case
                    while ((matchUrlToken = urlTokenRegExp.exec(src))) {
                        outgoingRelations.push(new AssetGraph.CssFontFaceSrc({
                            from: this,
                            to: {
                                url: matchUrlToken[2]
                            },
                            tokenNumber: tokenNumber,
                            parentRule: parentRuleOrStylesheet,
                            cssRule: cssRule
                        }));
                        tokenNumber += 1;
                    }
                }
            } else if (cssRule.type === cssom.CSSRule.STYLE_RULE) {
                var style = cssRule.style;
                for (var i = 0 ; i < style.length ; i += 1) {
                    var propertyName = style[i];
                    tokenNumber = 0;
                    if (propertyWithImageUrlRegExp.test(style[i])) {
                        var propertyValue = style.getPropertyValue(propertyName);
                        urlTokenRegExp.lastIndex = 0; // Just in case
                        while ((matchUrlToken = urlTokenRegExp.exec(propertyValue))) {
                            outgoingRelations.push(new AssetGraph.CssImage({
                                from: this,
                                to: {
                                    url: matchUrlToken[2]
                                },
                                tokenNumber: tokenNumber,
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                            tokenNumber += 1;
                        }
                    }
                }
                ['behavior', '_behavior'].forEach(function (propertyName) {
                    if (propertyName in style) {
                        // Skip behavior properties that have # as the first char in the url so that
                        // stuff like behavior(#default#VML) won't be treated as a relation.
                        var matchUrl = style[propertyName].match(/\burl\((\'|\"|)([^#\'\"][^\'\"]*?)\1\)/);
                        if (matchUrl) {
                            outgoingRelations.push(new AssetGraph.CssBehavior({
                                from: this,
                                to: {
                                    url: matchUrl[2]
                                },
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                        }
                    }
                }, this);
                ['filter', '_filter', '-ms-filter'].forEach(function (propertyName) {
                    if (propertyName in style) {
                        var tokenNumber = 0,
                            value = style.getPropertyValue(propertyName),
                            matchSrcToken;
                        alphaImageLoaderSrcRegExp.lastIndex = 0; // Just in case
                        while ((matchSrcToken = alphaImageLoaderSrcRegExp.exec(value))) {
                            outgoingRelations.push(new AssetGraph.CssAlphaImageLoader({
                                from: this,
                                to: {
                                    url: matchSrcToken[2]
                                },
                                tokenNumber: tokenNumber,
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                            tokenNumber += 1;
                        }
                    }
                }, this);
            }
        }.bind(this));
        return outgoingRelations;
    }
});

// Grrr...
Css.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

// If lambda returns false, subrules won't be traversed
Css.eachRuleInParseTree = function (ruleOrStylesheet, lambda) {
    _.toArray(ruleOrStylesheet.cssRules).forEach(function (cssRule) {
        if (lambda(cssRule, ruleOrStylesheet) !== false && cssRule.cssRules) {
            Css.eachRuleInParseTree(cssRule, lambda);
        }
    });
};

Css.prototype.eachRuleInParseTree = function (lambda) {
    return Css.eachRuleInParseTree(this.parseTree, lambda);
};

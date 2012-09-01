var util = require('util'),
    _ = require('underscore'),
    cssom = require('cssom-papandreou'),
    cssmin = require('cssmin'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    errors = require('../errors'),
    relations = require('../relations'),
    Asset = require('./Asset'),
    Text = require('./Text'),
    propertyWithImageUrlRegExp = /^(?:_?background(?:-image)?|(?:-[a-z]+-)?border-image)$/,
    urlTokenRegExp = /\burl\((\'|\"|)([^\'\"]+?)\1\)/g,
    alphaImageLoaderSrcRegExp = /AlphaImageLoader\([^\)]*src=([\'\"])(.+?)(\1)[^\)]*\)/gi;

function Css(config) {
    Text.call(this, config);
}

util.inherits(Css, Text);

function extractEncodingFromText(text) {
    var matchCharset = text.match(/@charset\s*([\'\"])\s*([\w\-]+)\s*\1/mi);
    return matchCharset && matchCharset[2]; // Will be undefined in case of no match
}

extendWithGettersAndSetters(Css.prototype, {
    contentType: 'text/css',

    defaultExtension: '.css',

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
            var text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
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
                this._parseTree = cssom.parse(this.text.replace(/@charset\s*([\'\"])\s*[\w\-]+\s*\1;/, ""));
            } catch (e) {
                var err = new errors.ParseError({
                    message: 'Parse error in ' + (this.url || 'inline Css' + (this.nonInlineAncestor ? ' in ' + this.nonInlineAncestor.url : '')) +
                        '(line ' + e.line + ', column ' + e['char'] + '):\n' + e.message +
                        (e.styleSheet ? '\nFalling back to using the ' + e.styleSheet.cssRules.length + ' parsed CSS rules' : ''),
                    styleSheet: e.styleSheet,
                    line: e.line,
                    column: e['char'],
                    asset: this
                });
                if (this.assetGraph) {
                    if (err.styleSheet) {
                        this._parseTree = err.styleSheet;
                    } else {
                        this._parseTree = {cssRules: []};
                    }
                    this.assetGraph.emit('error', err);
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
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [];
        Css.eachRuleInParseTree(this.parseTree, function (cssRule, parentRuleOrStylesheet) {
            if (cssRule.type === cssom.CSSRule.IMPORT_RULE) {
                outgoingRelations.push(new relations.CssImport({
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
                    var matchUrlToken,
                        tokenNumber = 0;
                    urlTokenRegExp.lastIndex = 0; // Just in case
                    while ((matchUrlToken = urlTokenRegExp.exec(src))) {
                        outgoingRelations.push(new relations.CssFontFaceSrc({
                            from: this,
                            to: {
                                url: matchUrlToken[2]
                            },
                            tokenNumber: tokenNumber++,
                            parentRule: parentRuleOrStylesheet,
                            cssRule: cssRule
                        }));
                    }
                }
            } else if (cssRule.type === cssom.CSSRule.STYLE_RULE) {
                var style = cssRule.style;
                for (var i = 0 ; i < style.length ; i += 1) {
                    var propertyName = style[i];
                    if (propertyWithImageUrlRegExp.test(style[i])) {
                        var matchUrlToken,
                            tokenNumber = 0,
                            propertyValue = style.getPropertyValue(propertyName);
                        urlTokenRegExp.lastIndex = 0; // Just in case
                        while ((matchUrlToken = urlTokenRegExp.exec(propertyValue))) {
                            outgoingRelations.push(new relations.CssImage({
                                from: this,
                                to: {
                                    url: matchUrlToken[2]
                                },
                                tokenNumber: tokenNumber++,
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                        }
                    }
                }
                ['behavior', '_behavior'].forEach(function (propertyName) {
                    if (propertyName in style) {
                        // Skip behavior properties that have # as the first char in the url so that
                        // stuff like behavior(#default#VML) won't be treated as a relation.
                        var matchUrl = style[propertyName].match(/\burl\((\'|\"|)([^#\'\"][^\'\"]*?)\1\)/);
                        if (matchUrl) {
                            outgoingRelations.push(new relations.CssBehavior({
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
                            outgoingRelations.push(new relations.CssAlphaImageLoader({
                                from: this,
                                to: {
                                    url: matchSrcToken[2]
                                },
                                tokenNumber: tokenNumber++,
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                        }
                    }
                }, this);
            }
        }, this);
        return outgoingRelations;
    }
});

// Grrr...
Css.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

Css.vendorPrefix = '-one'; // Should be in a more visible place

// If lambda returns false, subrules won't be traversed
Css.eachRuleInParseTree = function (ruleOrStylesheet, lambda, scope) {
    _.toArray(ruleOrStylesheet.cssRules).forEach(function (cssRule) {
        if (lambda.call(scope, cssRule, ruleOrStylesheet) !== false && cssRule.cssRules) {
            Css.eachRuleInParseTree(cssRule, lambda, scope);
        }
    });
};

Css.extractInfoFromRule = function (cssRule, propertyNamePrefix) {
    var info = {};
    for (var i = 0 ; i < cssRule.style.length ; i += 1) {
        var propertyName = cssRule.style[i];
        if (!propertyNamePrefix || propertyName.indexOf(propertyNamePrefix) === 0) {
            var keyName = propertyName.substr(propertyNamePrefix.length).replace(/-([a-z])/g, function ($0, $1) {
                return $1.toUpperCase();
            });
            info[keyName] = cssRule.style[propertyName].replace(/^([\'\"])(.*)\1$/, "$2");
        }
    }
    return info;
};

module.exports = Css;

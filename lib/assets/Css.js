var util = require('util'),
    _ = require('underscore'),
    cssom = require('../3rdparty/CSSOM/lib'),
    cssmin = require('cssmin'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    relations = require('../relations'),
    Base = require('./Base'),
    Text = require('./Text'),
    propertyWithImageUrlRegExp = /^(?:_?background(?:-image)?|(?:-[a-z]+-)?border-image)$/;

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
            if (this._metadata && this._metadata.encoding) {
                this._encoding = this._metadata.encoding;
            } else if (this._text) {
                this._encoding = extractEncodingFromText(this._text) || this.defaultEncoding;
            } else if (this._rawSrc) {
                this._encoding = extractEncodingFromText(this._rawSrc.toString('binary', 0, Math.min(1024, this._rawSrc.length))) || this.defaultEncoding;
            } else {
                throw new Error('assets.Css.encoding getter: No _text or _rawSrc found');
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
        if (!this._text) {
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

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
        this.markDirty();
    },

    get parseTree() {
        if (!this._parseTree) {
            // CSSOM gets the @charset declaration mixed up with the first selector:
            this._parseTree = cssom.parse(this.text.replace(/@charset\s*([\'\"])\s*[\w\-]+\s*\1;/, ""));
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this._parseTree = parseTree;
        delete this._rawSrc;
        delete this._text;
        this.markDirty();
    },

    isEmpty: function () {
        return this.parseTree.cssRules.length === 0;
    },

    minify: function () {
        this.isPretty = false;
        this.markDirty();
    },

    prettyPrint: function () {
        this.isPretty = true;
        this.markDirty();
    },

    getRelations: function () {
        var that = this,
            _relations = [];
        Css.eachRuleInParseTree(this.parseTree, function (cssRule, parentRuleOrStylesheet) {
            if (cssRule.type === cssom.CSSRule.IMPORT_RULE) {
                _relations.push(new relations.CssImport({
                    from: that,
                    to: cssRule.href,
                    parentRule: parentRuleOrStylesheet,
                    cssRule: cssRule
                }));
            } else if (cssRule.type === cssom.CSSRule.STYLE_RULE) {
                var style = cssRule.style;
                for (var i = 0 ; i < style.length ; i += 1) {
                    var propertyName = style[i];
                    if (propertyWithImageUrlRegExp.test(style[i])) {
                        var urlMatch = style[propertyName].match(/\burl\((\'|\"|)([^\'\"]+?)\1\)/);
                        if (urlMatch) {
                            _relations.push(new relations.CssImage({
                                from: that,
                                to: urlMatch[2],
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
                        var urlMatch = style[propertyName].match(/\burl\((\'|\"|)([^#\'\"][^\'\"]*?)\1\)/);
                        if (urlMatch) {
                            _relations.push(new relations.CssBehavior({
                                from: that,
                                to: urlMatch[2],
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                        }
                    }
                });

                ['filter', '_filter', '-ms-filter'].forEach(function (propertyName) {
                    if (propertyName in style) {
                        // FIXME: Tokenize properly (parentheses in urls, etc.)
                        var alphaImageLoaderMatch = style[propertyName].match(/AlphaImageLoader\([^\)]*src=([\'\"])(.+?)(\1)[^\)]*\)/i);
                        if (alphaImageLoaderMatch) {
                            _relations.push(new relations.CssAlphaImageLoader({
                                from: that,
                                to: alphaImageLoaderMatch[2],
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule,
                                propertyName: propertyName
                            }));
                        }
                    }
                });
            }
        });
        return _relations;
    },

    detachRelation: function (relation) {
        relation.remove();
    }
});

Css.vendorPrefix = '-one'; // Should be in a more visible place

Css.mergeParseTrees = function (parseTrees) {
    var bundledParseTree = new cssom.CSSStyleSheet();
    parseTrees.forEach(function (parseTree) {
        Array.prototype.push.apply(bundledParseTree.cssRules, parseTree.cssRules);
    });
    return bundledParseTree;
};

Css.eachRuleInParseTree = function (ruleOrStylesheet, lambda) {
    _.toArray(ruleOrStylesheet.cssRules).forEach(function (cssRule) {
        lambda(cssRule, ruleOrStylesheet);
        if (cssRule.cssRules) {
            Css.eachRuleInParseTree(cssRule, lambda);
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

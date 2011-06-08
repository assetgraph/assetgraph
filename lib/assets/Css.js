var util = require('util'),
    _ = require('underscore'),
    cssom = require('../3rdparty/CSSOM/lib'),
    cssmin = require('cssmin'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    relations = require('../relations'),
    Text = require('./Text'),
    propertyWithImageUrlRegExp = /^(?:_?background(?:-image)?|(?:-[a-z]+-)?border-image)$/;

function Css(config) {
    Text.call(this, config);
}

util.inherits(Css, Text);

function extractEncodingFromDecodedSrc(decodedSrc) {
    var matchCharset = decodedSrc.match(/@charset\s*([\'\"])\s*([\w\-]+)\s*\1/mi);
    return matchCharset && matchCharset[2]; // Will be undefined in case of no match
}

_.extend(Css.prototype, {
    contentType: 'text/css',

    defaultExtension: '.css',

    isPretty: false,

    getOriginalEncoding: function (cb) {
        var that = this;
        if (that.originalEncoding) {
            process.nextTick(function () {
                cb(null, that.originalEncoding);
            });
        } else if (that.decodedSrc) {
            process.nextTick(function () {
                cb(null, extractEncodingFromDecodedSrc(that.decodedSrc) || that.defaultEncoding);
            });
        } else if (that.hasRawSrc()) {
            that.getRawSrc(passError(cb, function (rawSrc) {
                cb(null, extractEncodingFromDecodedSrc(rawSrc.toString("binary", 0, Math.min(1024, rawSrc.length))) || that.defaultEncoding);
            }));
        } else {
            process.nextTick(function () {
                cb(null, that.defaultEncoding);
            });
        }
    },

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        this.getDecodedSrc(passError(cb, function (decodedSrc) {
            // CssOM gets the @charset declaration mixed up with the first selector:
            decodedSrc = decodedSrc.replace(/@charset\s*([\'\"])\s*[\w\-]+\s*\1;/, "");
            cb(null, cssom.parse(decodedSrc));
        }));
    }),

    isEmpty: function (cb) {
        this.getParseTree(passError(cb, function (parseTree) {
            cb(null, parseTree.cssRules.length === 0);
        }));
    },

    minify: function (cb) {
        this.isPretty = false;
        process.nextTick(cb);
    },

    prettyPrint: function (cb) {
        this.isPretty = true;
        process.nextTick(cb);
    },

    getText: function (cb) {
        var that = this;
        that.getParseTree(passError(cb, function (parseTree) {
            var cssString = parseTree.toString();
            if (!that.isPretty) {
                cssString = cssmin.cssmin(cssString);
            }
            cb(null, cssString);
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
       var that = this;
       this.getParseTree(passError(cb, function (parseTree) {
            var originalRelations = [];

            Css.eachRuleInParseTree(parseTree, function (cssRule, parentRuleOrStylesheet) {
                if (cssRule.type === cssom.CSSRule.IMPORT_RULE) {
                    originalRelations.push(new relations.CssImport({
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
                            var urlMatch = style[propertyName].match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                            if (urlMatch) {
                                originalRelations.push(new relations.CssImage({
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
                            var urlMatch = style[propertyName].match(/\burl\((\'|\"|)([^#\'\"][^\'\"]*)\1\)/);
                            if (urlMatch) {
                                originalRelations.push(new relations.CssBehavior({
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
                                originalRelations.push(new relations.CssAlphaImageLoader({
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
            cb(null, originalRelations);
        }));
    }),

    detachRelation: function (relation) {
        relation.remove();
    }
});

Css.vendorPrefix = '-one'; // Should be in a more visible place

Css.mergeParseTrees = function (parseTrees, cb) {
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

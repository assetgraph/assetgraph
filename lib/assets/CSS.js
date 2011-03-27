var util = require('util'),
    _ = require('underscore'),
    step = require('step'),
    cssom = require('cssom'),
    cssmin = require('cssmin'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    relations = require('../relations'),
    Text = require('./Text'),
    propertyWithImageUrlRegExp = /^(?:_?background(?:-image)?|(?:-[a-z]+-)?border-image)$/;

function CSS(config) {
    Text.call(this, config);
}

util.inherits(CSS, Text);

function extractEncodingFromDecodedSrc(decodedSrc) {
    var matchCharset = decodedSrc.match(/@charset\s*([\'\"])\s*([\w\-]+)\s*\1/mi);
    return matchCharset && matchCharset[2]; // Will be undefined in case of no match
}

_.extend(CSS.prototype, {
    contentType: 'text/css',

    defaultExtension: 'css',

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
            that.getRawSrc(error.passToFunction(cb, function (rawSrc) {
                cb(null, extractEncodingFromDecodedSrc(rawSrc.toString("binary", 0, Math.min(1024, rawSrc.length))) || that.defaultEncoding);
            }));
        } else {
            process.nextTick(function () {
                cb(null, that.defaultEncoding);
            });
        }
    },

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        this.getDecodedSrc(error.passToFunction(cb, function (decodedSrc) {
            // CSSOM gets the @charset declaration mixed up with the first selector:
            decodedSrc = decodedSrc.replace(/@charset\s*([\'\"])\s*[\w\-]+\s*\1;/, "");
            cb(null, cssom.parse(decodedSrc));
        }));
    }),

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
        that.getParseTree(error.passToFunction(cb, function (parseTree) {
            var cssString = parseTree.toString();
            if (!that.isPretty) {
                cssString = cssmin.cssmin(cssString);
            }
            cb(null, cssString);
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
       var that = this;
       this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];

            function traverse(parentRuleOrStylesheet) {
                _.toArray(parentRuleOrStylesheet.cssRules).forEach(function (cssRule) {
                    if (cssRule.type === cssom.CSSRule.IMPORT_RULE) {
                        originalRelations.push(new relations.CSSImport({
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
                                    originalRelations.push(new relations.CSSImage({
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
                                var urlMatch = style[propertyName].match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                                if (urlMatch) {
                                    originalRelations.push(new relations.CSSBehavior({
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
                                    originalRelations.push(new relations.CSSAlphaImageLoader({
                                        from: that,
                                        to: alphaImageLoaderMatch[2],
                                        parentRule: parentRuleOrStylesheet,
                                        cssRule: cssRule,
                                        propertyName: propertyName
                                    }));
                                }
                            }
                        });
                        if ((CSS.vendorPrefix + '-sprite-selector-for-group') in style) {
                            originalRelations.push(new relations.CSSSpritePlaceholder({
                                from: that,
                                to: {
                                    type: 'SpriteConfiguration',
                                    parseTree: CSS.extractInfoFromRule(cssRule, CSS.vendorPrefix + '-sprite-')
                                },
                                parentRule: parentRuleOrStylesheet,
                                cssRule: cssRule
                            }));
                        }
                    } else {
                        // MEDIA_RULE, FONT_FACE_RULE, PAGE_RULE, WEBKIT_KEYFRAMES_RULE, WEBKIT_KEYFRAME_RULE
                        if (cssRule.cssRules) {
                            traverse(cssRule);
                        }
                    }
                });
            }
            traverse(parseTree);
            cb(null, originalRelations);
        }));
    }),

    detachRelation: function (relation) {
        relation.remove();
    }
});

CSS.vendorPrefix = '-one'; // Should be in a more visible place

CSS.makeBundle = function (cssAssets, cb) {
    step(
        function () {
            var group = this.group();
            cssAssets.forEach(function (cssAsset) {
                cssAsset.getParseTree(group());
            });
        },
        error.passToFunction(cb, function (parseTrees) {
            var bundledParseTree = new cssom.CSSStyleSheet();
            parseTrees.forEach(function (parseTree) {
                [].push.apply(bundledParseTree.cssRules, parseTree.cssRules);
            });
            cb(null, new CSS({
                parseTree: bundledParseTree
            }));
        })
    );
};

CSS.extractInfoFromRule = function (cssRule, propertyNamePrefix) {
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

module.exports = CSS;

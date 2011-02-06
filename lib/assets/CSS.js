var util = require('util'),
    _ = require('underscore'),
    step = require('step'),
    cssom = require('cssom'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    relations = require('../relations'),
    Base = require('./Base').Base;

function CSS(config) {
    Base.call(this, config);
}

util.inherits(CSS, Base);

_.extend(CSS.prototype, {
    contentType: 'text/css',

    defaultExtension: 'css',

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            cb(null, cssom.parse(src));
        }));
    }),

    serialize: function (cb) {
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            cb(null, parseTree.toString());
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var originalRelations = [];
            _.toArray(parseTree.cssRules).forEach(function (cssRule) {
                var style = cssRule.style;
                ['background-image', 'background',
                 '_background-image', '_background'].forEach(function (propertyName) {
                    var propertyValue = style[propertyName];
                    if (propertyValue) {
                        var urlMatch = propertyValue.match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                        if (urlMatch) {
                            originalRelations.push(new relations.CSSBackgroundImage({
                                from: that,
                                cssRule: cssRule,
                                propertyName: propertyName,
                                assetConfig: urlMatch[2]
                            }));
                        }
                    }
                });
                if ('behavior' in style) {
                    var urlMatch = style.behavior.match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                    if (urlMatch) {
                        originalRelations.push(new relations.CSSBehavior({
                            from: that,
                            cssRule: cssRule,
                            assetConfig: urlMatch[2]
                        }));
                    }
                }
                ['filter', '_filter', '-ms-filter'].forEach(function (propertyName) {
                    if (propertyName in style) {
                        // FIXME: Tokenize properly (parentheses in urls, etc.)
                        var alphaImageLoaderMatch = style.filter.match(/AlphaImageLoader\([^\)]*src=([\'\"])(.+?)(\1)[^\)]*\)/i);
                        if (alphaImageLoaderMatch) {
                            originalRelations.push(new relations.CSSAlphaImageLoader({
                                from: that,
                                cssRule: cssRule,
                                propertyName: propertyName,
                                assetConfig: alphaImageLoaderMatch[2]
                            }));
                        }
                    }
                });
                if ((CSS.vendorPrefix + '-sprite-selector-for-group') in style) {
                    originalRelations.push(new relations.CSSSpritePlaceholder({
                        from: that,
                        cssRule: cssRule,
                        assetConfig: {
                            type: 'SpriteConfiguration',
                            originalSrc: CSS.extractInfoFromRule(cssRule, CSS.vendorPrefix + '-sprite-')
                        }
                    }));
                }
            });
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

exports.CSS = CSS;

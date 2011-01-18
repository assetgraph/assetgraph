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

_.extend(CSS.prototype, {
    contentType: 'text/css',

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getOriginalSrc(error.passToFunction(cb, function (src) {
            that.parseTree = cssom.parse(src);
            cb(null, that.parseTree);
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
                ['background-image', 'background'].forEach(function (propertyName) {
                    var propertyValue = cssRule.style[propertyName];
                    if (propertyValue) {
                        var urlMatch = propertyValue.match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                        if (urlMatch) {
                            var dataUrlMatch = urlMatch[2].match(/^data:(image\/png|gif|jpeg)(;base64)?,(.*)$/),
                                assetConfig = {};
                            if (dataUrlMatch) {
                                assetConfig.contentType = dataUrlMatch[1];
                                if (dataUrlMatch[2]) {
                                    assetConfig.originalSrc = new Buffer(dataUrlMatch[3], 'base64').toString();
                                } else {
                                    assetConfig.originalSrc = dataUrlMatch[3];
                                }
                            } else {
                                assetConfig.url = urlMatch[2];
                            }
                            originalRelations.push(new relations.CSSBackgroundImage({
                                from: that,
                                cssRule: cssRule,
                                propertyName: propertyName,
                                assetConfig: assetConfig
                            }));
                        }
                    }
                });
            });
            cb(null, originalRelations);
        }));
    }),

    detachRelation: function (relation) {
        relation.remove();
    }
});

exports.CSS = CSS;

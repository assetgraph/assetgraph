var util = require('util'),
    _ = require('underscore'),
    cssom = require('../3rdparty/cssom/lib'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    Base = require('./Base');

var CSS = module.exports = function (config) {
    Base.call(this, config);
};

util.inherits(CSS, Base);

_.extend(CSS.prototype, {
    getParseTree: makeBufferedAccessor('parseTree', function (cb) {
        var This = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            This.parseTree = cssom.parse(src);
            cb(null, This.parseTree);
        }));
    }),

    getRelations: makeBufferedAccessor('relations', function (cb) {
        var This = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var relations = {};
            function addRelation(config) {
                (relations[config.type] = relations[config.type] || []).push(config);
            }
            _.toArray(parseTree.cssRules).forEach(function (cssRule) {
                ['background-image', 'background'].forEach(function (propertyName) {
                    var propertyValue = cssRule.style[propertyName];
                    if (propertyValue) {
                        var urlMatch = propertyValue.match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                        if (urlMatch) {
                            var dataUrlMatch = urlMatch[2].match(/^data:image\/(png|gif|jpeg)(;base64)?,(.*)$/),
                                config = {
                                    cssRule: cssRule,
                                    propertyName: propertyName,
                                    type: 'css-background-image',
                                    baseUrl: this.baseUrlForRelations
                                };
                            if (dataUrlMatch) {
                                config.assetType = dataUrlMatch[1];
                                if (dataUrlMatch[2]) {
                                    config.inlineData = new Buffer(dataUrlMatch[3], 'base64').toString();
                                } else {
                                    config.inlineData = dataUrlMatch[3];
                                }
                            } else {
                                config.url = urlMatch[2];
                            }
                            addRelation(config);
                        }
                    }
                });
            });
            cb(null, relations);
        }));
    })
});

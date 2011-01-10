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
        var that = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            that.parseTree = cssom.parse(src);
            cb(null, that.parseTree);
        }));
    }),

    getPointers: makeBufferedAccessor('pointers', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var pointers = {};
            function addPointer(config) {
                config.asset = that;
                (pointers[config.type] = pointers[config.type] || []).push(config);
            }
            _.toArray(parseTree.cssRules).forEach(function (cssRule) {
                ['background-image', 'background'].forEach(function (propertyName) {
                    var propertyValue = cssRule.style[propertyName];
                    if (propertyValue) {
                        var urlMatch = propertyValue.match(/\burl\((\'|\"|)([^\'\"]+)\1\)/);
                        if (urlMatch) {
                            var dataUrlMatch = urlMatch[2].match(/^data:image\/(png|gif|jpeg)(;base64)?,(.*)$/),
                                assetConfig = {
                                    type: 'Image'
                                };
                            if (dataUrlMatch) {
                                assetConfig.contentType = "image/" + dataUrlMatch[1];
                                if (dataUrlMatch[2]) {
                                    assetConfig.src = new Buffer(dataUrlMatch[3], 'base64').toString();
                                } else {
                                    assetConfig.src = dataUrlMatch[3];
                                }
                            } else {
                                assetConfig.url = urlMatch[2];
                            }
                            addPointer({
                                cssRule: cssRule,
                                propertyName: propertyName,
                                type: 'cssBackgroundImage',
                                assetConfig: assetConfig
                            });
                        }
                    }
                });
            });
            cb(null, pointers);
        }));
    })
});

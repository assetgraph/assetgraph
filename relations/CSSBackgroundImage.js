/*global require, exports*/
var util = require('util'),
    Buffer = require('buffer').Buffer,
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function CSSBackgroundImage(config) {
    Base.call(this, config);
}

util.inherits(CSSBackgroundImage, Base);

_.extend(CSSBackgroundImage.prototype, {
    remove: function () {
        var style = this.cssRule.style;
        if (this.propertyName === 'background-image' || style[this.propertyName].match(/^url\((\'|\"|)([^\'\"]+)\1\)^/)) {
            style[this.propertyName] = null;
        } else {
            // We're attached to a 'background' property with other tokens in it. Just remove the url()
            style[this.propertyName] = style[this.propertyName].replace(/\burl\((\'|\"|)([^\'\"]+)\1\)\s?/, "");
        }
        delete this.propertyName;
        delete this.cssRule;
    },

    setUrl: function (url) {
        var style = this.cssRule.style;
        style[this.propertyName] = style[this.propertyName].replace(/\burl\((\'|\"|)([^\'\"]+)\1\)/, function () {
            return "url('" + url + "')"; // TODO: Only quote if necessary
        });
    },

    inline: function (cb) {
        var that = this;
        this.to.serialize(error.passToFunction(cb, function (src) {
            that.setUrl("data:" + that.to.getContentType() + ";base64," + new Buffer(src).toString('base64'));
            that.isInline = true;
            delete that.url;
            cb();
        }));
    }
});

exports.CSSBackgroundImage = CSSBackgroundImage;

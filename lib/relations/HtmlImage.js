/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function HtmlImage(config) {
    Base.call(this, config);
}

util.inherits(HtmlImage, Base);

_.extend(HtmlImage.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    _inline: function (cb) {
        var that = this;
        that.to.getSerializedSrc(passError(cb, function (src) {
            that._setRawUrlString("data:" + that.to.contentType + ";base64," + src.toString('base64'));
            cb();
        }));
    },

    createNode: function (document) {
        return document.createElement('img');
    }
});

module.exports = HtmlImage;

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

    _inline: function () {
        this._setRawUrlString("data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64'));
    },

    createNode: function (document) {
        return document.createElement('img');
    }
});

module.exports = HtmlImage;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlIFrame(config) {
    Base.call(this, config);
}

util.inherits(HtmlIFrame, Base);

_.extend(HtmlIFrame.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('iframe');
    }
});

module.exports = HtmlIFrame;

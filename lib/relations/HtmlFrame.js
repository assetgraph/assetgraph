/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlFrame(config) {
    Base.call(this, config);
}

util.inherits(HtmlFrame, Base);

_.extend(HtmlFrame.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('frame');
    }
});

module.exports = HtmlFrame;

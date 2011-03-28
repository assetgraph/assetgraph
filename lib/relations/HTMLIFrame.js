/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HTMLIFrame(config) {
    Base.call(this, config);
}

util.inherits(HTMLIFrame, Base);

_.extend(HTMLIFrame.prototype, {
    _getRawUrlString: function () {
        this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('iframe');
    }
});

module.exports = HTMLIFrame;

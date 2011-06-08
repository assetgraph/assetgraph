/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlAudio(config) {
    Base.call(this, config);
}

util.inherits(HtmlAudio, Base);

_.extend(HtmlAudio.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('audio');
    }
});

module.exports = HtmlAudio;

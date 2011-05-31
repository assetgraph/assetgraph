/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HTMLVideo(config) {
    Base.call(this, config);
}

util.inherits(HTMLVideo, Base);

_.extend(HTMLVideo.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('video');
    }
});

module.exports = HTMLVideo;

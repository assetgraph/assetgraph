/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function HTMLIFrame(config) {
    Base.call(this, config);
}

util.inherits(HTMLIFrame, Base);

_.extend(HTMLIFrame.prototype, {
    setUrl: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('iframe');
    }
});

exports.HTMLIFrame = HTMLIFrame;

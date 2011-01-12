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
        this.tag.setAttribute('src', url);
    }
});

exports.HTMLIFrame = HTMLIFrame;

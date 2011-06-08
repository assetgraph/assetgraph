/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

// Requires: config.attributeName
function HtmlApplet(config) {
    Base.call(this, config);
}

util.inherits(HtmlApplet, Base);

_.extend(HtmlApplet.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute(this.attributeName);
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute(this.attributeName, url);
    }
});

module.exports = HtmlApplet;

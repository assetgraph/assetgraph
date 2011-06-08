/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlAnchor(config) {
    Base.call(this, config);
}

util.inherits(HtmlAnchor, Base);

_.extend(HtmlAnchor.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('href');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('href', url);
    },

    createNode: function (document) {
        return document.createElement('a');
    }
});

module.exports = HtmlAnchor;

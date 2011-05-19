/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../util/error'),
    Base = require('./Base');

function HTMLAlternateLink(config) {
    Base.call(this, config);
}

util.inherits(HTMLAlternateLink, Base);

_.extend(HTMLAlternateLink.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('href');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('href', url);
    },

    createNode: function (document) {
        var node = document.createElement('link');
        node.rel = 'alternate';
        // FIXME: Set type attribute the target asset's mime type?
        return node;
    }
});

module.exports = HTMLAlternateLink;

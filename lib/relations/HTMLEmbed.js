/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HTMLEmbed(config) {
    Base.call(this, config);
}

util.inherits(HTMLEmbed, Base);

_.extend(HTMLEmbed.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('embed');
    }
});

module.exports = HTMLEmbed;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HTMLEdgeSideInclude(config) {
    Base.call(this, config);
}

util.inherits(HTMLEdgeSideInclude, Base);

_.extend(HTMLEdgeSideInclude.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src');
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('esi:include');
    }
});

module.exports = HTMLEdgeSideInclude;

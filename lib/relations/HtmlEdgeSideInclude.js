/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

function HtmlEdgeSideInclude(config) {
    Base.call(this, config);
}

util.inherits(HtmlEdgeSideInclude, Base);

_.extend(HtmlEdgeSideInclude.prototype, {
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

module.exports = HtmlEdgeSideInclude;

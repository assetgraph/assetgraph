/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base');

// Requires: config.attributeName
function HtmlObject(config) {
    Base.call(this, config);
}

util.inherits(HtmlObject, Base);

_.extend(HtmlObject.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute(this.attributeName);
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute(this.attributeName, url);
    }
});

module.exports = HtmlObject;

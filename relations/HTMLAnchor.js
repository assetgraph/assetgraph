/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function HTMLAnchor(config) {
    Base.call(this, config);
}

util.inherits(HTMLAnchor, Base);

_.extend(HTMLAnchor.prototype, {
    _setRawUrlString: function (url) {
        this.node.setAttribute('href', url);
    },

    createNode: function (document) {
        return document.createElement('a');
    }
});

exports.HTMLAnchor = HTMLAnchor;

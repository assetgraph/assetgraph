/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function HTMLScript(config) {
    Base.call(this, config);
}

util.inherits(HTMLScript, Base);

_.extend(HTMLScript.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('src') || undefined;
    },

    _setRawUrlString: function (url) {
        this.node.setAttribute('src', url);
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    },

    _inline: function (cb) {
        var that = this;
        that.to.getText(passError(cb, function (text) {
            if (that.node.hasAttribute('src')) {
                that.node.removeAttribute('src');
            }
            while (that.node.firstChild) {
                that.node.removeChild(that.node.firstChild);
            }
            that.node.appendChild(that.from.parseTree.createTextNode(text));
            cb();
        }));
    },

    createNode: function (document) {
        return document.createElement('script');
    }
});

module.exports = HTMLScript;

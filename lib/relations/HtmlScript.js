/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function HtmlScript(config) {
    Base.call(this, config);
}

util.inherits(HtmlScript, Base);

_.extend(HtmlScript.prototype, {
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

    _inline: function () {
        if (this.node.hasAttribute('src')) {
            this.node.removeAttribute('src');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
    },

    createNode: function (document) {
        return document.createElement('script');
    }
});

module.exports = HtmlScript;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
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

    _inline: function (src) {
        if (this.node.hasAttribute('src')) {
            this.node.removeAttribute('src');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(src));
    },

    createNode: function (document) {
        return document.createElement('script');
    }
});

module.exports = HTMLScript;

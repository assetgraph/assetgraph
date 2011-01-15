/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function HTMLScript(config) {
    Base.call(this, config);
}

util.inherits(HTMLScript, Base);

_.extend(HTMLScript.prototype, {
    setUrl: function (url) {
        this.node.setAttribute('src', url);
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(firstChild);
        }
    },

    inline: function (cb) {
        var that = this;
        this.to.serialize(error.passToFunction(cb, function (src) {
            if (that.node.hasAttribute('src')) {
                that.node.removeAttribute('src');
            }
            while (that.node.firstChild) {
                that.node.removeChild(that.node.firstChild);
            }
            that.node.appendChild(that.from.parseTree.createTextNode(src));
            that.isInline = true;
            delete that.url;
            cb();
        }));
    },

    createNode: function (document) {
        return document.createElement('script');
    }
});

exports.HTMLScript = HTMLScript;

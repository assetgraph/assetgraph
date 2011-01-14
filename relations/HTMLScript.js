/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify').uglify,
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

    inline: function (src) {
        if (this.node.hasAttribute('src')) {
            this.node.removeAttribute('src');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(uglify.gen_code(this.to.parseTree, true)));
    },

    createNode: function (document) {
        return document.createElement('script');
    }
});

exports.HTMLScript = HTMLScript;

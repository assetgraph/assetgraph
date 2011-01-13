/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
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
        if (this.node.nodeName === 'style') {
            while (this.node.firstChild) {
                this.node.removeChild(this.node.firstChild);
            }
            this.node.appendChild(document.createTextNode(src));
        } else {
            var document = this.node.ownerDocument,
                style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(src));
            this.node.parentNode.replaceChild(style, this.node);
            this.node = style;
        }
    }
});

HTMLIFrame.createNodeForAsset = function (document, asset) {
    return document.createElement('script');
};

exports.HTMLScript = HTMLScript;

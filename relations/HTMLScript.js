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
        this.tag.setAttribute('src', url);
        // Clear any inline script
        while (this.tag.firstChild) {
            this.tag.removeChild(firstChild);
        }
    },

    inline: function (src) {
        if (this.tag.hasAttribute('src')) {
            this.tag.removeAttribute('src');
        }
        if (this.tag.nodeName === 'style') {
            while (this.tag.firstChild) {
                this.tag.removeChild(this.tag.firstChild);
            }
            this.tag.appendChild(document.createTextNode(src));
        } else {
            var document = this.tag.ownerDocument,
                style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(src));
            this.tag.parentNode.replaceChild(style, this.tag);
            this.tag = style;
        }
    }
});

exports.HTMLScript = HTMLScript;

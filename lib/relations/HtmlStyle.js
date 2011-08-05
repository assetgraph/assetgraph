/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function HtmlStyle(config) {
    Base.call(this, config);
}

util.inherits(HtmlStyle, Base);

_.extend(HtmlStyle.prototype, {
    _getRawUrlString: function () {
        if (this.node.nodeName === 'link') {
            return this.node.getAttribute('href');
        }
        // Else return undefined
    },

    _setRawUrlString: function (url) {
        if (this.node.nodeName === 'link') {
            this.node.setAttribute('href', url);
        } else {
            var document = this.node.ownerDocument,
                link = document.createElement('link'),
                existingMediaAttributeValue = this.node.getAttribute('media');
            if (existingMediaAttributeValue) {
                link.setAttribute('media', existingMediaAttributeValue);
            }
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', url);
            this.node.parentNode.replaceChild(link, this.node);
            this.node = link;
        }
    },

    _inline: function () {
        if (this.node.nodeName === 'style') {
            while (this.node.firstChild) {
                this.node.removeChild(this.node.firstChild);
            }
            this.node.appendChild(document.createTextNode(this.to.text));
        } else {
            var document = this.node.ownerDocument,
                style = document.createElement('style'),
                existingMediaAttributeValue = this.node.getAttribute('media');
            style.setAttribute('type', 'text/css');
            if (existingMediaAttributeValue) {
                style.setAttribute('media', existingMediaAttributeValue);
            }
            style.appendChild(document.createTextNode(this.to.text));
            this.node.parentNode.replaceChild(style, this.node);
            this.node = style;
        }
    },

    createNode: function (document) {
        var node = document.createElement('link');
        node.rel = 'stylesheet';
        return node;
    }
});

module.exports = HtmlStyle;

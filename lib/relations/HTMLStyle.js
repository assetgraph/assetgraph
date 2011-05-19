/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../util/error'),
    Base = require('./Base');

function HTMLStyle(config) {
    Base.call(this, config);
}

util.inherits(HTMLStyle, Base);

_.extend(HTMLStyle.prototype, {
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

    _inline: function (cb) {
        var that = this;
        that.to.getText(error.passToFunction(cb, function (text) {
            if (that.node.nodeName === 'style') {
                while (that.node.firstChild) {
                    that.node.removeChild(that.node.firstChild);
                }
                that.node.appendChild(document.createTextNode(text));
            } else {
                var document = that.node.ownerDocument,
                    style = document.createElement('style'),
                    existingMediaAttributeValue = that.node.getAttribute('media');
                style.setAttribute('type', 'text/css');
                if (existingMediaAttributeValue) {
                    style.setAttribute('media', existingMediaAttributeValue);
                }
                style.appendChild(document.createTextNode(text));
                that.node.parentNode.replaceChild(style, that.node);
                that.node = style;
            }
            cb();
        }));
    },

    createNode: function (document) {
        var node = document.createElement('link');
        node.rel = 'stylesheet';
        return node;
    }
});

module.exports = HTMLStyle;

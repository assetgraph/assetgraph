/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlStyle(config) {
    Base.call(this, config);
}

util.inherits(HtmlStyle, Base);

extendWithGettersAndSetters(HtmlStyle.prototype, {
    get href() {
        if (this.node.nodeName === 'link') {
            return this.node.getAttribute('href');
        }
        // Else return undefined
    },

    set href(href) {
        if (this.node.nodeName === 'link') {
            this.node.setAttribute('href', href);
        } else {
            var document = this.node.ownerDocument,
                link = document.createElement('link'),
                existingMediaAttributeValue = this.node.getAttribute('media');
            if (existingMediaAttributeValue) {
                link.setAttribute('media', existingMediaAttributeValue);
            }
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', href);
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
        this.from.markDirty();
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('link');
        this.node.setAttribute('rel', 'stylesheet');
        if (position === 'first') {
            document.head.appendChild(this.node); // FIXME: Should check for existing <style> / <link rel='stylesheet'> tags in <head>
        } else {
            this.from._attachNode(this.node, position, adjacentRelation.node);
        }
        Base.prototype.attach.apply(this, arguments);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Base.prototype.detach.call(this);
    }
});

module.exports = HtmlStyle;

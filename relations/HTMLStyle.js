/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    Base = require('./Base').Base;

function HTMLStyle(config) {
    Base.call(this, config);
}

util.inherits(HTMLStyle, Base);

_.extend(HTMLStyle.prototype, {
    setUrl: function (url) {
        if (this.tag.nodeName === 'link') {
            this.tag.href = url;
        } else {
            var document = this.tag.ownerDocument,
                link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            this.tag.parentNode.replaceChild(link, this.tag);
            this.tag = link;
        }
    },

    inline: function (src) {
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

exports.HTMLStyle = HTMLStyle;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function HTMLStyle(config) {
    Base.call(this, config);
}

util.inherits(HTMLStyle, Base);

_.extend(HTMLStyle.prototype, {
    _setRawUrlString: function (url) {
        if (this.node.nodeName === 'link') {
            this.node.href = url;
        } else {
            var document = this.node.ownerDocument,
                link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            this.node.parentNode.replaceChild(link, this.node);
            this.node = link;
        }
    },

    _inline: function (cb) {
        var that = this;
        this.to.serialize(error.passToFunction(cb, function (src) {
            if (that.node.nodeName === 'style') {
                while (that.node.firstChild) {
                    that.node.removeChild(that.node.firstChild);
                }
                this.node.appendChild(document.createTextNode(src));
            } else {
                var document = that.node.ownerDocument,
                    style = document.createElement('style');
                style.type = 'text/css';
                style.appendChild(document.createTextNode(src));
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

exports.HTMLStyle = HTMLStyle;

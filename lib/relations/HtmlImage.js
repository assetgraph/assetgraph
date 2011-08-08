/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlImage(config) {
    Base.call(this, config);
}

util.inherits(HtmlImage, Base);

extendWithGettersAndSetters(HtmlImage.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(url) {
        this.node.setAttribute('src', url);
    },

    _inline: function () {
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
    },

    createNode: function (document) {
        return document.createElement('img');
    }
});

module.exports = HtmlImage;

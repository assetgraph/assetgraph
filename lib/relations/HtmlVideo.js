/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlVideo(config) {
    Base.call(this, config);
}

util.inherits(HtmlVideo, Base);

extendWithGettersAndSetters(HtmlVideo.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    createNode: function (document) {
        return document.createElement('video');
    }
});

module.exports = HtmlVideo;

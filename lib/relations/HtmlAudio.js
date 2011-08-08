/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlAudio(config) {
    Base.call(this, config);
}

util.inherits(HtmlAudio, Base);

extendWithGettersAndSetters(HtmlAudio.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(url) {
        this.node.setAttribute('src', url);
    },

    createNode: function (document) {
        return document.createElement('audio');
    }
});

module.exports = HtmlAudio;

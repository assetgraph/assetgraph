/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlFrame(config) {
    Base.call(this, config);
}

util.inherits(HtmlFrame, Base);

extendWithGettersAndSetters(HtmlFrame.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    createNode: function (document) {
        return document.createElement('frame');
    }
});

module.exports = HtmlFrame;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlEmbed(config) {
    Base.call(this, config);
}

util.inherits(HtmlEmbed, Base);

extendWithGettersAndSetters(HtmlEmbed.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    createNode: function (document) {
        return document.createElement('embed');
    }
});

module.exports = HtmlEmbed;

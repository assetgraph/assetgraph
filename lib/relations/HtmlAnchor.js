/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlAnchor(config) {
    Base.call(this, config);
}

util.inherits(HtmlAnchor, Base);

extendWithGettersAndSetters(HtmlAnchor.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    createNode: function (document) {
        return document.createElement('a');
    }
});

module.exports = HtmlAnchor;

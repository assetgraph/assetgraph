/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlAlternateLink(config) {
    Base.call(this, config);
}

util.inherits(HtmlAlternateLink, Base);

extendWithGettersAndSetters(HtmlAlternateLink.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    createNode: function (document) {
        var node = document.createElement('link');
        node.rel = 'alternate';
        // FIXME: Set type attribute the target asset's mime type?
        return node;
    }
});

module.exports = HtmlAlternateLink;

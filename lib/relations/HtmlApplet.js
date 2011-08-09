/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

// Requires: config.attributeName
function HtmlApplet(config) {
    Base.call(this, config);
}

util.inherits(HtmlApplet, Base);

extendWithGettersAndSetters(HtmlApplet.prototype, {
    get href() {
        return this.node.getAttribute(this.attributeName);
    },

    set href(href) {
        this.node.setAttribute(this.attributeName, href);
    }
});

module.exports = HtmlApplet;

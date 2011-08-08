/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

// Requires: config.attributeName
function HtmlObject(config) {
    Base.call(this, config);
}

util.inherits(HtmlObject, Base);

extendWithGettersAndSetters(HtmlObject.prototype, {
    get href() {
        return this.node.getAttribute(this.attributeName);
    },

    set href(url) {
        this.node.setAttribute(this.attributeName, url);
    }
});

module.exports = HtmlObject;

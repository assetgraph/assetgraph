/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlEdgeSideInclude(config) {
    Base.call(this, config);
}

util.inherits(HtmlEdgeSideInclude, Base);

extendWithGettersAndSetters(HtmlEdgeSideInclude.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    createNode: function (document) {
        return document.createElement('esi:include');
    }
});

module.exports = HtmlEdgeSideInclude;

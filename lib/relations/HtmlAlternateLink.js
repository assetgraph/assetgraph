/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlAlternateLink(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlAlternateLink, HtmlRelation);

extendWithGettersAndSetters(HtmlAlternateLink.prototype, {
    get href() {
        return this.node.getAttribute('href');
    },

    set href(href) {
        this.node.setAttribute('href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setProperty('rel', 'alternate');
        this.node.setProperty('type', this.to.contentType);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlAlternateLink;

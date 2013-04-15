/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlPictureSource(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlPictureSource, HtmlRelation);

extendWithGettersAndSetters(HtmlPictureSource.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    attach: function (asset, position, adjacentRelation) {
        // This should probably ensure that the parent element is <picture>, but oh well...
        this.node = asset.parseTree.createElement('source');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlPictureSource;

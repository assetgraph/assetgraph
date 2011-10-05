/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlVideo(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlVideo, HtmlRelation);

extendWithGettersAndSetters(HtmlVideo.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('video');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlVideo;

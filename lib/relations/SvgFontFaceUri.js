/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    SvgRelation = require('./SvgRelation');

function SvgFontFaceUri(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgFontFaceUri, SvgRelation);

extendWithGettersAndSetters(SvgFontFaceUri.prototype, {
    get href() {
        return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    },

    set href(href) {
        this.node.setAttribute('http://www.w3.org/1999/xlink', 'href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('font-face-uri');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgFontFaceUri;

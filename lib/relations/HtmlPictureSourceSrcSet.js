/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlPictureSourceSrcSet(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlPictureSourceSrcSet, HtmlRelation);

extendWithGettersAndSetters(HtmlPictureSourceSrcSet.prototype, {
    set href() {
        throw new Error('Cannot set href of a HtmlPictureSourceSrcSet relation (always inline)');
    },

    get href() {
        throw new Error('Cannot get href of a HtmlPictureSourceSrcSet relation (always inline)');
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('srcset', this.to.text);
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('source');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlPictureSourceSrcSet;

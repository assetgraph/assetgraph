var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlImageSrcSet(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlImageSrcSet, HtmlRelation);

extendWithGettersAndSetters(HtmlImageSrcSet.prototype, {
    set href() {
        throw new Error('Cannot set href of a HtmlImageSrcSet relation (always inline)');
    },

    get href() {
        throw new Error('Cannot get href of a HtmlImageSrcSet relation (always inline)');
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('srcset', this.to.text);
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('img');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlImageSrcSet;

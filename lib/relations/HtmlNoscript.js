var util = require('util');
var extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters');
var HtmlRelation = require('./HtmlRelation');

function HtmlNoscript(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlNoscript, HtmlRelation);

extendWithGettersAndSetters(HtmlNoscript.prototype, {
    inline() {
        HtmlRelation.prototype.inline.call(this);
        this.node.innerHTML = this.to.text;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('noscript');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);

        this.from.markDirty();

        return this;
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = asset.parseTree.createElement('noscript');

        HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);

        this.from.markDirty();

        return this;
    }
});

module.exports = HtmlNoscript;

/*global require*/
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlTemplate(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlTemplate, HtmlRelation);

extendWithGettersAndSetters(HtmlTemplate.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.innerHTML = this.to.text;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('template');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlTemplate;

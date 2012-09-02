/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlKnockoutContainerless(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlKnockoutContainerless, HtmlRelation);

extendWithGettersAndSetters(HtmlKnockoutContainerless.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.nodeValue = " ko " + this.to.text.replace(/^\(\{|\}\);?$/g, '') + " ";
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("HtmlKnockoutContainerless.attach: Not supported.");
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlKnockoutContainerless;

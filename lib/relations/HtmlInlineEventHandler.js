/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlInlineEventHandler(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlInlineEventHandler, HtmlRelation);

extendWithGettersAndSetters(HtmlInlineEventHandler.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute(this.attributeName, this.to.text.replace(/^function[^{]*\{|};?\s*$/g, ""));
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("HtmlInlineEventHandler.attach: Not supported.");
    },

    detach: function () {
        this.node.removeAttribute(this.attributeName);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlInlineEventHandler;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlDataBindAttribute(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlDataBindAttribute, HtmlRelation);

extendWithGettersAndSetters(HtmlDataBindAttribute.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('data-bind', this.to.text.replace(/^\(\{|\}\);?$/g, ''));
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("HtmlDataBindAttribute.attach: Not supported.");
    },

    detach: function () {
        this.node.removeAttribute('data-bind');
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlDataBindAttribute;

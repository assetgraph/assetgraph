var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    SvgRelation = require('./SvgRelation');

function SvgInlineEventHandler(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgInlineEventHandler, SvgRelation);

extendWithGettersAndSetters(SvgInlineEventHandler.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute(this.attributeName, this.to.text.replace(/^function[^{]*\{|};?\s*$/g, ''));
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('SvgInlineEventHandler.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute(this.attributeName);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = SvgInlineEventHandler;

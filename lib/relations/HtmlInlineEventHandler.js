var util = require('util'),
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
        this.node.setAttribute(this.attributeName, this.to.text.replace(/^function[^{]*\{|};?\s*$/g, ''));
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('HtmlInlineEventHandler.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute(this.attributeName);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlInlineEventHandler;

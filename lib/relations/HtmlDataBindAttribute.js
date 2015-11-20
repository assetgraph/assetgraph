var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlDataBindAttribute(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlDataBindAttribute, HtmlRelation);

extendWithGettersAndSetters(HtmlDataBindAttribute.prototype, {
    propertyName: 'data-bind',
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute(this.propertyName, this.to.text.replace(/^\(\{\s*|\s*\}\);?$/g, ''));
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('HtmlDataBindAttribute.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute(this.propertyName);
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlDataBindAttribute;

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    SvgRelation = require('./SvgRelation');

function SvgStyleAttribute(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgStyleAttribute, SvgRelation);

extendWithGettersAndSetters(SvgStyleAttribute.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('style', this.to.text.replace(/^bogusselector\s*\{|}\s*$/g, ''));
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('SvgStyleAttribute.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute('style');
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = SvgStyleAttribute;

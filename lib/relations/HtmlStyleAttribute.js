var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlStyleAttribute(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlStyleAttribute, HtmlRelation);

extendWithGettersAndSetters(HtmlStyleAttribute.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('style', this.to.text.replace(/^bogusselector\s*\{|}\s*$/g, ''));
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('HtmlStyleAttribute.attach: Not supported.');
    },

    detach: function () {
        this.node.removeAttribute('style');
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlStyleAttribute;

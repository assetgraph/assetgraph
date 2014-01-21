var util = require('util'),
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
        this.node.nodeValue = (this.to.isPretty ? ' ' : '') + 'ko ' + this.to.text.replace(/^\(\{\s*|\s*\}\);?$/g, '') + (this.to.isPretty ? ' ' : '');
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('HtmlKnockoutContainerless.attach: Not supported.');
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlKnockoutContainerless;

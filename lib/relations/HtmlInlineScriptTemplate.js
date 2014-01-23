var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlInlineScriptTemplate(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlInlineScriptTemplate, HtmlRelation);

extendWithGettersAndSetters(HtmlInlineScriptTemplate.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.textContent = this.to.text;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        this.node.setAttribute('type', this.to.contentType);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);

        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlInlineScriptTemplate;

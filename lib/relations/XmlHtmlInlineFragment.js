var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function XmlHtmlInlineFragment(config) {
    HtmlRelation.call(this, config);
}

util.inherits(XmlHtmlInlineFragment, HtmlRelation);

extendWithGettersAndSetters(XmlHtmlInlineFragment.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.textContent = this.to.text;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement(this.node.nodeName);
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);

        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = XmlHtmlInlineFragment;

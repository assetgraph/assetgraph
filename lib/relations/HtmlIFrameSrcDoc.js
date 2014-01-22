var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlIFrameSrcDoc(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlIFrameSrcDoc, HtmlRelation);

extendWithGettersAndSetters(HtmlIFrameSrcDoc.prototype, {
    set href(href) {
        throw new Error('Cannot set href of a HtmlIFrameSrcDoc relation (always inline)');
    },

    get href() {
        throw new Error('Cannot get href of a HtmlIFrameSrcDoc relation (always inline)');
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('srcdoc', this.to.text);
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('iframe');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlIFrameSrcDoc;

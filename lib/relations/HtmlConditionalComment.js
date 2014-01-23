var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlConditionalComment(config) {
    if (!('condition' in config)) {
        throw new Error('HtmlConditionalComment constructor: \'condition\' config option is mandatory.');
    }
    HtmlRelation.call(this, config);
}

util.inherits(HtmlConditionalComment, HtmlRelation);

extendWithGettersAndSetters(HtmlConditionalComment.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        var text = this.to.text,
            matchText = this.to.text.match(/<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/);
        if (matchText) {
            text = matchText[1];
        }

        this.node.nodeValue = '[if ' + this.condition + ']>' + text + '<![endif]';
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createComment();
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlConditionalComment;

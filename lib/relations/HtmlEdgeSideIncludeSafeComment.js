var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlEdgeSideIncludeSafeComment(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlEdgeSideIncludeSafeComment, HtmlRelation);

extendWithGettersAndSetters(HtmlEdgeSideIncludeSafeComment.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        var text = this.to.text,
            matchText = this.to.text.match(/<!--ASSETGRAPH DOCUMENT START MARKER-->([\s\S]*)<!--ASSETGRAPH DOCUMENT END MARKER-->/);
        if (matchText) {
            text = matchText[1];
        }

        this.node.nodeValue = 'esi ' + text;
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createComment();
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlEdgeSideIncludeSafeComment;

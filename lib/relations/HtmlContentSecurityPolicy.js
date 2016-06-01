var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlContentSecurityPolicy(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlContentSecurityPolicy, HtmlRelation);

extendWithGettersAndSetters(HtmlContentSecurityPolicy.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node.setAttribute('content', this.to.text);
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('meta');
        this.node.setAttribute('http-equiv', 'Content-Security-Policy');
        if (position === 'before' || position === 'after') {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        } else {
            asset.parseTree.head.appendChild(this.node);
        }
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlContentSecurityPolicy;

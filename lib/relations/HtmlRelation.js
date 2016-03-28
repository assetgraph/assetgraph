var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    query = require('../query');

function HtmlRelation(config) {
    Relation.call(this, config);
}

util.inherits(HtmlRelation, Relation);

extendWithGettersAndSetters(HtmlRelation.prototype, {
    // This is very hacky because relations in Html fragments (and Htc assets)
    // need to be interpreted as relative to the "main" Html asset.
    // Also, relations found inside Html in Rss and Atom assets need to be interpreted as relative to the Rss/Atom asset.
    baseAssetQuery: query.or({type: 'Rss', isInline: false}, {type: 'Atom', isInline: false}, {type: 'Html', isInline: false, isFragment: false}),

    // Override in subclass for relations that don't support inlining, are attached to attributes, etc.
    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.to.type === 'JavaScript') {
            // eslint-disable-next-line no-script-url
            this.href = 'javascript:' + this.to.text;
        } else {
            this.href = this.to.dataUrl;
        }
        this.from.markDirty();
        return this;
    },

    attachNodeBeforeOrAfter: function (position, adjacentRelation) {
        if (position !== 'before' && position !== 'after') {
            throw new Error('HtmlRelation._attachNode: The "position" parameter must be either "before" or "after"');
        }
        var adjacentNode = (position === 'after' && adjacentRelation.endNode) || adjacentRelation.node,
            parentNode = adjacentNode.parentNode;
        if (!parentNode) {
            throw new Error('HtmlRelation.attachNodeBeforeOrAfter: Adjacent node has no parentNode.');
        }
        if (position === 'after') {
            parentNode.insertBefore(this.node, adjacentNode.nextSibling);
        } else {
            parentNode.insertBefore(this.node, adjacentNode);
        }
    },

    // Override in subclass for relations that aren't detached by removing this.node from the DOM.
    detach: function () {
        this.node.parentNode.removeChild(this.node);
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlRelation;

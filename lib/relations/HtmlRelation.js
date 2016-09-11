var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlRelation(config) {
    Relation.call(this, config);
}

util.inherits(HtmlRelation, Relation);

extendWithGettersAndSetters(HtmlRelation.prototype, {
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

    attachToHead: function (asset, position, adjacentNode) {
        if (!asset || !asset.isAsset || asset.type !== 'Html') {
            throw new Error('HtmlRelation.attachToHead: The "asset" parameter must be an Html asset');
        }

        if (['first', 'last', 'before', 'after'].indexOf(position) === -1) {
            throw new Error('HtmlRelation.attachToHead: The "position" parameter must be either "first", "last", "before" or "after"');
        }

        if (position === 'before' || position === 'after') {
            if (!adjacentNode) {
                throw new Error('HtmlRelation.attachToHead: The "adjacentNode" parameter must be a DOM node if "position" parameter is "before" or "after"');
            } else {
                if (adjacentNode.parentNode !== asset.parseTree.head) {
                    throw new Error('HtmlRelation.attachToHead: The "adjacentNode" parameter must be a DOM node inside <head>');
                }
            }
        }

        if (!this.node) {
            throw new Error('HtmlRelation.attachToHead: `this.node` must be a HTML element');
        }

        var firstBodyRelation;
        var document = asset.parseTree;
        var head = document.head;

        // Create head node if it's missing
        if (!head) {
            var htmlNode = document.querySelector('html');
            head = document.createElement('head');

            htmlNode.insertBefore(head, htmlNode.firstChild);
        }

        var headRelations = asset.outgoingRelations.filter(function (relation) {
            return relation.node.parentNode === head;
        });
        var lastHeadRelation = headRelations[headRelations.length - 1];

        // If there is nothing in <head>, figure out where this new relation fits in
        if (headRelations.length === 0) {
            firstBodyRelation = asset.outgoingRelations.find(function (relation) {
                return relation.node.matches('body *');
            });
        }

        if (position === 'first') {
            head.insertBefore(this.node, head.firstChild);

            if (headRelations[0]) {
                return Relation.prototype.attach.call(this, asset, 'before', headRelations[0]);
            } else if (firstBodyRelation) {
                return Relation.prototype.attach.call(this, asset, 'before', firstBodyRelation);
            } else {
                return Relation.prototype.attach.call(this, asset, 'last');
            }
        }

        if (position === 'last') {
            head.appendChild(this.node);

            if (lastHeadRelation) {
                return Relation.prototype.attach.call(this, asset, 'after', lastHeadRelation);
            } else if (firstBodyRelation) {
                return Relation.prototype.attach.call(this, asset, 'before', firstBodyRelation);
            } else {
                return Relation.prototype.attach.call(this, asset, 'last');
            }
        }

        // For 'before' and 'after' positions we split dom node insertion and relation attachment
        if (position === 'before') {
            head.insertBefore(this.node, adjacentNode);
        }

        if (position === 'after') {
            head.insertBefore(this.node, adjacentNode.nextSibling);
        }

        // Figure out which assetgraph relation has a node after the inserted node
        var headNodes = [].slice.call(head.childNodes);
        var myNodeIdx = headNodes.indexOf(this.node);
        var relativeRelation = headRelations.find(function (relation) {
            return headNodes.indexOf(relation.node) > myNodeIdx;
        });

        if (relativeRelation) {
            // Insert before the relation with a higher dom node index
            return Relation.prototype.attach.call(this, asset, 'before', relativeRelation);
        } else {
            // Insert after last head relation
            return Relation.prototype.attach.call(this, asset, 'after', lastHeadRelation);
        }
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

const Relation = require('./Relation');

class HtmlRelation extends Relation {
    // Override in subclass for relations that don't support inlining, are attached to attributes, etc.
    inline() {
        super.inline();
        if (this.to.type === 'JavaScript') {
            // eslint-disable-next-line no-script-url
            this.href = 'javascript:' + this.to.text;
        } else {
            this.href = this.to.dataUrl;
        }
        this.from.markDirty();
        return this;
    }

    attachToHead(asset, position, adjacentNode) {
        if (!asset || !asset.isAsset || asset.type !== 'Html') {
            throw new Error('HtmlRelation.attachToHead: The "asset" parameter must be an Html asset');
        }

        if (!['first', 'last', 'before', 'after'].includes(position)) {
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

        if (!this || !this.node) {
            throw new Error('HtmlRelation.attachToHead: `this.node` must be a HTML element');
        }

        const document = asset.parseTree;
        let firstBodyRelation;
        let head = document.head;

        // Create head node if it's missing
        if (!head) {
            const htmlNode = document.querySelector('html');

            if (!htmlNode) {
                const err = new Error('HtmlRelation.attachToHead: Could not attach asset ' + this.to.toString() + ' to <head>. Missing <html> and <head>');
                err.asset = asset;
                throw err;
            }

            head = document.createElement('head');

            htmlNode.insertBefore(head, htmlNode.firstChild);
        }

        const headRelations = asset.outgoingRelations.filter(
            relation => relation.node.parentNode === head
        );
        const lastHeadRelation = headRelations[headRelations.length - 1];

        // If there is nothing in <head>, figure out where this new relation fits in
        if (headRelations.length === 0) {
            firstBodyRelation = asset.outgoingRelations.find(function (relation) {
                return relation.node.matches('body *');
            });
        }

        if (position === 'first') {
            head.insertBefore(this.node, head.firstChild);

            if (headRelations[0]) {
                return super.attach(asset, 'before', headRelations[0]);
            } else if (firstBodyRelation) {
                return super.attach(asset, 'before', firstBodyRelation);
            } else {
                return super.attach(asset, 'last');
            }
        }

        if (position === 'last') {
            head.appendChild(this.node);

            if (lastHeadRelation) {
                return super.attach(asset, 'after', lastHeadRelation);
            } else if (firstBodyRelation) {
                return super.attach(asset, 'before', firstBodyRelation);
            } else {
                return super.attach(asset, 'last');
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
        const headNodes = Array.from(head.childNodes);
        const myNodeIndex = headNodes.indexOf(this.node);
        const relativeRelation = headRelations.find(
            relation => headNodes.indexOf(relation.node) > myNodeIndex
        );

        if (relativeRelation) {
            // Insert before the relation with a higher dom node index
            return super.attach(asset, 'before', relativeRelation);
        } else {
            // Insert after last head relation
            return super.attach(asset, 'after', lastHeadRelation);
        }
    }

    attachNodeBeforeOrAfter(position, adjacentRelation) {
        if (position !== 'before' && position !== 'after') {
            throw new Error('HtmlRelation._attachNode: The "position" parameter must be either "before" or "after"');
        }
        const adjacentNode = (position === 'after' && adjacentRelation.endNode) || adjacentRelation.node;
        const parentNode = adjacentNode.parentNode;
        if (!parentNode) {
            throw new Error('HtmlRelation.attachNodeBeforeOrAfter: Adjacent node has no parentNode.');
        }
        if (position === 'after') {
            parentNode.insertBefore(this.node, adjacentNode.nextSibling);
        } else {
            parentNode.insertBefore(this.node, adjacentNode);
        }
    }

    // Override in subclass for relations that aren't detached by removing this.node from the DOM.
    detach() {
        this.node.parentNode.removeChild(this.node);
        this.node = undefined;
        return super.detach();
    }
};

module.exports = HtmlRelation;

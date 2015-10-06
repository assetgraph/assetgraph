var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptInclude(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptInclude, Relation);

extendWithGettersAndSetters(JavaScriptInclude.prototype, {
    get href() {
        return this.node.arguments[0].value;
    },

    set href(href) {
        this.node.arguments[0].value = href;
    },

    inline: function () {
        throw new Error('JavaScriptInclude.inline(): Not supported');
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = {
            type: 'CallExpression',
            callee: {
                type: 'Identifier',
                name: 'INCLUDE'
            },
            arguments: [ { type: 'Literal', value: '<urlGoesHere>' } ]
        };
        if (position === 'before' || position === 'after') {
            if (adjacentRelation.detachableNode.type === 'ExpressionStatement') {
                this.detachableNode = { type: 'ExpressionStatement', expression: this.node };
            } else {
                // Assume SequenceExpression
                this.detachableNode = this.node;
            }
            if (adjacentRelation.parentNode.type === 'SequenceExpression') {
                this.parentNode = adjacentRelation.parentNode;
                var insertionIndex = this.parentNode.expressions.indexOf(adjacentRelation.node) + (position === 'before' ? 0 : 1);
                this.parentNode.expressions.splice(insertionIndex, 0, this.node);
            } else {
                this.parentNode = adjacentRelation.parentNode;
                var adjacentDetachableNodeIndex = this.parentNode.body.indexOf(adjacentRelation.detachableNode);
                if (adjacentDetachableNodeIndex === -1) {
                    throw new Error('JavaScriptInclude.attach: adjacentRelation.node not found');
                }
                this.parentNode.body.splice(adjacentDetachableNodeIndex + (position === 'after' ? 1 : 0), 0, this.detachableNode);
            }
        } else {
            this.parentNode = asset.parseTree;
            this.detachableNode = { type: 'ExpressionStatement', expression: this.node };
            if (position === 'first') {
                this.parentNode.body.unshift(this.detachableNode);
            } else if (position === 'last') {
                this.parentNode.body.push(this.detachableNode);
            } else {
                throw new Error('JavaScriptInclude.attach: Unsupported \'position\' value: ' + position);
            }
        }
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        if (this.parentNode.type === 'SequenceExpression') {
            var index = this.parentNode.expressions.indexOf(this.detachableNode);
            if (index === -1) {
                throw new Error('JavaScriptInclude.detach: this.detachableNode not found in this.parentNode');
            } else {
                this.parentNode.expressions.splice(index, 1);
            }
        } else {
            var parentNodeIndex = this.parentNode.body.indexOf(this.detachableNode);
            if (parentNodeIndex === -1) {
                throw new Error('JavaScriptInclude.detach: this.detachableNode not a child of this.parentNode.');
            }
            this.parentNode.body.splice(parentNodeIndex, 1);
        }
        this.parentNode = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptInclude;

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptImportScripts(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptImportScripts, Relation);

extendWithGettersAndSetters(JavaScriptImportScripts.prototype, {
    get href() {
        return this.node.value;
    },

    set href(href) {
        this.node.value = href;
    },

    inline: function () {
        throw new Error('JavaScriptImportScripts.inline(): Not supported');
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = { type: 'Literal', value: '<urlGoesHere>' };
        var callNode = {
            type: 'CallExpression',
            callee: {
                type: 'Identifier',
                name: 'importScripts'
            },
            arguments: [ this.node ]
        };
        if (position === 'before' || position === 'after') {
            if (adjacentRelation.detachableNode.type === 'ExpressionStatement') {
                this.detachableNode = { type: 'ExpressionStatement', expression: callNode };
            } else {
                // Assume SequenceExpression
                this.detachableNode = callNode;
            }
            if (adjacentRelation.parentNode.type === 'SequenceExpression') {
                this.parentNode = adjacentRelation.parentNode;
                var insertionIndex = this.parentNode.expressions.indexOf(adjacentRelation.node) + (position === 'before' ? 0 : 1);
                this.parentNode.expressions.splice(insertionIndex, 0, callNode);
            } else {
                this.parentNode = adjacentRelation.parentNode;
                var adjacentDetachableNodeIndex = this.parentNode.body.indexOf(adjacentRelation.detachableNode);
                if (adjacentDetachableNodeIndex === -1) {
                    throw new Error('JavaScriptImportScripts.attach: adjacentRelation.node not found');
                }
                this.parentNode.body.splice(adjacentDetachableNodeIndex + (position === 'after' ? 1 : 0), 0, this.detachableNode);
            }
        } else {
            this.parentNode = asset.parseTree;
            this.detachableNode = { type: 'ExpressionStatement', expression: callNode };
            if (position === 'first') {
                this.parentNode.body.unshift(this.detachableNode);
            } else if (position === 'last') {
                this.parentNode.body.push(this.detachableNode);
            } else {
                throw new Error('JavaScriptImportScripts.attach: Unsupported \'position\' value: ' + position);
            }
        }
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        var i = this.argumentsNode.indexOf(this.node);
        if (i === -1) {
            throw new Error('relations.JavaScriptWebWorker.detach: this.node not found in module array of this.arrayNode.');
        }
        this.argumentsNode.splice(i, 1);
        if (this.argumentsNode.length === 0) {
            // Remove the importScripts() call instead of leaving it with no arguments
            this.parentNode.body.splice(this.parentNode.body.indexOf(this.detachableNode), 1);
        }
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptImportScripts;

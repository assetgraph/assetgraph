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
        if (position === 'before' || position === 'after') {
            this.detachableNode = adjacentRelation.detachableNode;
            this.argumentsNode = adjacentRelation.argumentsNode;
            this.parentNode = adjacentRelation.parentNode;
            var argumentsNodeIndex = this.argumentsNode.indexOf(adjacentRelation.node);
            if (argumentsNodeIndex === -1) {
                throw new Error('JavaScriptImportScripts.attach: adjacentRelation.node not found in adjacentRelation.argumentsNode');
            }
            this.argumentsNode.splice(argumentsNodeIndex + (position === 'after' ? 1 : 0), 0, this.node);
        } else {
            this.parentNode = asset.parseTree;
            this.detachableNode = {
                type: 'ExpressionStatement',
                expression: {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: 'importScripts'
                    },
                    arguments: [ this.node ]
                }
            };
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
            if (this.parentNode.type === 'SequenceExpression') {
                this.parentNode.expressions.splice(this.parentNode.expressions.indexOf(this.detachableNode), 1);
            } else {
                this.parentNode.body.splice(this.parentNode.body.indexOf(this.detachableNode), 1);
            }
        }
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptImportScripts;

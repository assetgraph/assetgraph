/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptOneInclude(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptOneInclude, Relation);

extendWithGettersAndSetters(JavaScriptOneInclude.prototype, {
    get href() {
        return this.node[2][0][1];
    },

    set href(href) {
        this.node[2][0][1] = href;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = [
            'call',
            [
                'dot',
                [
                    'name',
                    'one'
                ],
                'include'
            ],
            [
                [
                    'string',
                    '<urlGoesHere>'
                ]
            ]
        ];
        if (position === 'before' || position === 'after') {
            this.parentNode = adjacentRelation.parentNode;
            var adjacentDetachableNodeIndex = this.parentNode.indexOf(adjacentRelation.detachableNode);
            if (adjacentDetachableNodeIndex === -1) {
                throw new Error("relations.JavaScriptOneInclude.attach: adjacentRelation.node not found");
            }
            if (adjacentRelation.detachableNode[0] === 'stat') {
                this.detachableNode = ['stat', this.node];
            } else {
                // Assume 'seq'
                this.detachableNode = this.node;
            }
            this.parentNode.splice(adjacentDetachableNodeIndex + (position === 'after' ? 1 : 0), 0, this.detachableNode);
        } else {
            this.parentNode = this.from.parseTree[1];
            this.detachableNode = ['stat', this.node];
            if (position === 'first') {
                this.parentNode.unshift(this.detachableNode);
            } else if (position === 'last') {
                this.parentNode.push(this.detachableNode);
            } else {
                throw new Error("relations.JavaScriptOneInclude.attach: Unsupported 'position' value: " + position);
            }
        }
        Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        var parentNodeIndex = this.parentNode.indexOf(this.detachableNode);
        if (parentNodeIndex === -1) {
            throw new Error("relations.JavaScriptOneInclude.detach: this.detachableNode not a child of this.parentNode.");
        }
        this.parentNode.splice(parentNodeIndex, 1);
        Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptOneInclude;

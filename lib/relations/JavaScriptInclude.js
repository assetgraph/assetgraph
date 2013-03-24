/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptInclude(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptInclude, Relation);

extendWithGettersAndSetters(JavaScriptInclude.prototype, {
    get href() {
        return this.node.args[0].value;
    },

    set href(href) {
        this.node.args[0].value = href;
    },

    inline: function () {
        throw new Error("JavaScriptInclude.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = [
            'call',
            [
                'name',
                'INCLUDE'
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
            var adjacentDetachableNodeIndex = this.parentNode.body.indexOf(adjacentRelation.detachableNode);
            if (adjacentDetachableNodeIndex === -1) {
                throw new Error("JavaScriptInclude.attach: adjacentRelation.node not found");
            }
            if (adjacentRelation.detachableNode instanceof uglifyJs.AST_SimpleStatement) {
                this.detachableNode = new uglifyJs.AST_SimpleStatement({body: this.node});
            } else {
                // Assume uglifyJs.AST_Seq
                this.detachableNode = this.node;
            }
            this.parentNode.body.splice(adjacentDetachableNodeIndex + (position === 'after' ? 1 : 0), 0, this.detachableNode);
        } else {
            this.parentNode = asset.parseTree;
            this.detachableNode = new uglifyJs.AST_SimpleStatement({body: this.node});
            if (position === 'first') {
                this.parentNode.body.unshift(this.detachableNode);
            } else if (position === 'last') {
                this.parentNode.body.push(this.detachableNode);
            } else {
                throw new Error("JavaScriptInclude.attach: Unsupported 'position' value: " + position);
            }
        }
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        var parentNodeIndex = this.parentNode.indexOf(this.detachableNode);
        if (parentNodeIndex === -1) {
            throw new Error("JavaScriptInclude.detach: this.detachableNode not a child of this.parentNode.");
        }
        this.parentNode.splice(parentNodeIndex, 1);
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptInclude;

/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    uglifyJs = require('uglify-js'),
    uglifyAst = require('uglifyast')(uglifyJs),
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
        this.node = new uglifyJs.AST_Call({
            expression: new uglifyJs.AST_SymbolRef({
                name: 'INCLUDE'
            }),
            args: [new uglifyJs.AST_String({value: '<urlGoesHere>'})]
        });
        if (position === 'before' || position === 'after') {
            if (adjacentRelation.detachableNode instanceof uglifyJs.AST_SimpleStatement) {
                this.detachableNode = new uglifyJs.AST_SimpleStatement({body: this.node});
            } else {
                // Assume uglifyJs.AST_Seq
                this.detachableNode = this.node;
            }
            if (adjacentRelation.parentNode instanceof uglifyJs.AST_Seq) {
                this.parentNode = new uglifyJs.AST_Seq({
                    car: position === 'before' ? this.detachableNode : adjacentRelation.detachableNode,
                    cdr: position === 'before' ? adjacentRelation.detachableNode : this.detachableNode
                });
                uglifyAst.replaceDescendantNode(adjacentRelation.parentNode, adjacentRelation.detachableNode, this.parentNode);
                adjacentRelation.parentNode = this.parentNode;
            } else {
                this.parentNode = adjacentRelation.parentNode;
                var adjacentDetachableNodeIndex = this.parentNode.body.indexOf(adjacentRelation.detachableNode);
                if (adjacentDetachableNodeIndex === -1) {
                    throw new Error("JavaScriptInclude.attach: adjacentRelation.node not found");
                }
                this.parentNode.body.splice(adjacentDetachableNodeIndex + (position === 'after' ? 1 : 0), 0, this.detachableNode);
            }
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
        if (this.parentNode instanceof uglifyJs.AST_Seq) {
            if (this.parentNode.cdr instanceof uglifyJs.AST_Seq) {
                this.parentNode.car = this.parentNode.cdr.car;
                this.parentNode.cdr = this.parentNode.cdr.cdr;
            } else {
                if (this.parentNode.car === this.detachableNode) {
                    this.parentNode.car = new uglifyJs.AST_EmptyStatement();
                } else if (this.parentNode.cdr === this.detachableNode) {
                    this.parentNode.cdr = new uglifyJs.AST_EmptyStatement();
                } else {
                    throw new Error('JavaScriptInclude.detach: this.detachableNode is neither equal to this.parentNode.car nor this.parentNode.cdr');
                }
            }
        } else {
            var parentNodeIndex = this.parentNode.body.indexOf(this.detachableNode);
            if (parentNodeIndex === -1) {
                throw new Error("JavaScriptInclude.detach: this.detachableNode not a child of this.parentNode.");
            }
            this.parentNode.body.splice(parentNodeIndex, 1);
        }
        this.parentNode = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptInclude;

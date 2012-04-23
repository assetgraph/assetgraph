/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    HtmlRelation = require('./HtmlRelation');

function HtmlConditionalComment(config) {
    if (!('condition' in config)) {
        throw new Error("HtmlConditionalComment constructor: 'condition' config option is mandatory.");
    }
    HtmlRelation.call(this, config);
}

util.inherits(HtmlConditionalComment, HtmlRelation);

extendWithGettersAndSetters(HtmlConditionalComment.prototype, {
    set href() {
        throw new Error('Cannot set href of a HtmlConditionalComment relation (always inline)');
    },

    get href() {
        throw new Error('Cannot get href of a HtmlConditionalComment relation (always inline)');
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.condition === '!IE') {
            // <!--[if !IE]> --> ... <!-- <![endif]-->
            // Clear the existing content between the start and end markers:
            while (this.node.nextSibling && this.node.nextSibling !== this.endNode) {
                this.node.parentNode.removeChild(this.node.nextSibling);
            }
            // Create copies of the nodes in the target asset and insert them between the start and end markers:
            var div = this.from.parseTree.createElement('div');
            div.innerHTML = this.to.text;
            while (div.firstChild) {
                this.endNode.parentNode.insertBefore(div.firstChild, this.endNode);
            }
        } else {
            // <!--[if IE 6]> .... <![endif]-->
            this.node.nodeValue = '[if ' + this.condition + ']>' + this.to.text + '<![endif]';
        }
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createComment();
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        if (this.condition === '!IE') {
            this.node.nodeValue = '[if !IE]>';
            this.endNode = asset.parseTree.createComment('<![endif]');
            if (this.node.nextSibling) {
                this.node.parentNode.insertBefore(this.endNode, this.node.nextSibling);
            } else {
                this.node.parentNode.appendChild(this.endNode);
            }
        }
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlConditionalComment;

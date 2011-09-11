/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function HtmlScript(config) {
    Relation.call(this, config);
}

util.inherits(HtmlScript, Relation);

extendWithGettersAndSetters(HtmlScript.prototype, {
    get href() {
        return this.node.getAttribute('src') || undefined;
    },

    set href(href) {
        this.node.setAttribute('src', href);
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.node.hasAttribute('src')) {
            this.node.removeAttribute('src');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
        this.from.markDirty();
    },

    attach: function (asset, position, adjacentRelation) {
        this.from = asset;
        this.node = this.from.parseTree.createElement('script');
        if (position === 'first') {
            var existingScriptNodes = this.from.parseTree.getElementsByTagName('script');
            if (existingScriptNodes.length > 0) {
                existingScriptNodes[0].parentNode.insertBefore(this.node, existingScriptNodes[0]);
            } else if (this.from.parseTree.body) {
                this.from.parseTree.body.insertBefore(this.node, this.from.parseTree.body.firstChild);
            } else {
                this.from.parseTree.head.appendChild(this.node);
            }
        } else {
            this.from._attachNode(this.node, position, adjacentRelation.node);
        }
        Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.parentNode.removeChild(this.node);
        delete this.node;
        Relation.prototype.detach.call(this);
    }
});

module.exports = HtmlScript;

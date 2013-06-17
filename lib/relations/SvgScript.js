/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    SvgRelation = require('./SvgRelation');

function SvgScript(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgScript, SvgRelation);

extendWithGettersAndSetters(SvgScript.prototype, {
    get href() {
        return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || undefined;
    },

    set href(href) {
        this.node.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.node.hasAttributeNS('http://www.w3.org/1999/xlink', 'src')) {
            this.node.removeAttributeNS('http://www.w3.org/1999/xlink', 'src');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(this.to.text.replace(/<\/(?=(\s*)script[\/ >])/gi, '<\\/'))); // Safety hack for UglifyJS: https://github.com/mishoo/UglifyJS/issues/164
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('script');
        if (position === 'first') {
            var existingScriptNodes = asset.parseTree.getElementsByTagName('script');
            if (existingScriptNodes.length > 0) {
                existingScriptNodes[0].parentNode.insertBefore(this.node, existingScriptNodes[0]);
            } else if (asset.parseTree.body) {
                asset.parseTree.body.insertBefore(this.node, asset.parseTree.body.firstChild);
            } else {
                asset.parseTree.head.appendChild(this.node);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgScript;

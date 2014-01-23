var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    SvgRelation = require('./SvgRelation');

function SvgStyle(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgStyle, SvgRelation);

extendWithGettersAndSetters(SvgStyle.prototype, {
    get href() {
        return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || undefined;
    },

    set href(href) {
        this.node.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
        // In case this.node previously contained an inline stylesheet:
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        if (this.node.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
            this.node.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(this.to.text));
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        var parseTree = asset.parseTree;
        this.node = parseTree.createElement('style');
        if (position === 'first') {
            for (var i = 0 ; i < parseTree.childNodes.length ; i += 1) {
                var childNode = parseTree.childNodes[i],
                    nodeName = childNode.nodeName.toLowerCase(),
                    found = false;
                if (nodeName === 'style') {
                    found = true;
                    parseTree.insertBefore(this.node, childNode);
                    break;
                }
                if (!found) {
                    parseTree.appendChild(this.node);
                }
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgStyle;

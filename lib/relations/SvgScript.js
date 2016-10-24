var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation'),
    SvgRelation = require('./SvgRelation');

function SvgScript(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgScript, SvgRelation);

extendWithGettersAndSetters(SvgScript.prototype, {
    get href() {
        if (this.isXlink) {
            return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || undefined;
        } else {
            return this.node.getAttribute('href') || undefined;
        }
    },

    set href(href) {
        if (this.isXlink) {
            this.node.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
        } else {
            this.node.setAttribute('href', href);
        }
        // Clear any inline script
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        // Doesn't need xlink: prefix here for some reason:
        if (this.node.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
            this.node.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
        }
        while (this.node.firstChild) {
            this.node.removeChild(this.node.firstChild);
        }
        this.node.appendChild(this.from.parseTree.createTextNode(this.to.text.replace(/<\/(?=(\s*)script[\/ >])/gi, '<\\/'))); // Safety hack for UglifyJS: https://github.com/mishoo/UglifyJS/issues/164
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = this.node || asset.parseTree.createElement('script');
        if (position === 'first') {
            var document = asset.parseTree;
            var firstScriptNode = document.getElementsByTagName('script')[0];
            var svg;

            if (firstScriptNode && firstScriptNode !== this.node) {
                firstScriptNode.parentNode.insertBefore(this.node, firstScriptNode);
            } else {
                svg = document.getElementsByTagName('svg')[0];

                svg.insertBefore(this.node, svg.firstChild);
            }
        } else {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        }
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgScript;

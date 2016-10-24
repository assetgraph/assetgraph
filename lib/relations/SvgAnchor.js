var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    SvgRelation = require('./SvgRelation');

function SvgAnchor(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgAnchor, SvgRelation);

extendWithGettersAndSetters(SvgAnchor.prototype, {
    get href() {
        if (this.isXlink) {
            return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        } else {
            return this.node.getAttribute('href');
        }
    },

    set href(href) {
        if (this.isXlink) {
            this.node.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
        } else {
            this.node.setAttribute('href', href);
        }
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('a');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgAnchor;

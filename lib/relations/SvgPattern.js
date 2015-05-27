var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    SvgRelation = require('./SvgRelation');

function SvgPattern(config) {
    SvgRelation.call(this, config);
}

util.inherits(SvgPattern, SvgRelation);

extendWithGettersAndSetters(SvgPattern.prototype, {
    get href() {
        return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    },

    set href(href) {
        this.node.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('pattern');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return SvgRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = SvgPattern;

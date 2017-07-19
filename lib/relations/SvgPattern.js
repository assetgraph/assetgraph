const SvgRelation = require('./SvgRelation');

class SvgPattern extends SvgRelation {
    get href() {
        if (this.isXlink) {
            return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        } else {
            return this.node.getAttribute('href');
        }
    }

    set href(href) {
        if (this.isXlink) {
            this.node.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
        } else {
            this.node.setAttribute('href', href);
        }
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('pattern');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = SvgPattern;

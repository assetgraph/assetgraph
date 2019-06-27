var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlImage(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlImage, HtmlRelation);

extendWithGettersAndSetters(HtmlImage.prototype, {
    attributeName: 'src',

    get href() {
        return this.node.getAttribute(this.attributeName);
    },

    set href(href) {
        this.node.setAttribute(this.attributeName, href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('img');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlImage;

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlFrame(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlFrame, HtmlRelation);

extendWithGettersAndSetters(HtmlFrame.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('frame');
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlFrame;

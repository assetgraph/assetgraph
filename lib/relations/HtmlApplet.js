var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

// Requires: config.attributeName
function HtmlApplet(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlApplet, HtmlRelation);

extendWithGettersAndSetters(HtmlApplet.prototype, {
    get href() {
        return this.node.getAttribute(this.attributeName);
    },

    set href(href) {
        this.node.setAttribute(this.attributeName, href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('applet');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlApplet;

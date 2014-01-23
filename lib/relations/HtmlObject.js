var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

// Requires: config.attributeName
function HtmlObject(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlObject, HtmlRelation);

extendWithGettersAndSetters(HtmlObject.prototype, {
    get href() {
        return this.node.getAttribute(this.attributeName);
    },

    set href(href) {
        this.node.setAttribute(this.attributeName, href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('object');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlObject;

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlMsApplicationTileImageMeta(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlMsApplicationTileImageMeta, HtmlRelation);

extendWithGettersAndSetters(HtmlMsApplicationTileImageMeta.prototype, {
    get href() {
        return this.node.getAttribute('content');
    },

    set href(href) {
        this.node.setAttribute('content', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('meta');
        this.node.setAttribute('name', 'msapplication-TileImage');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlMsApplicationTileImageMeta;

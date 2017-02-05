var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function getNode(relation, htmlAsset) {
    var node = htmlAsset.parseTree.createElement('meta');
    node.setAttribute('name', 'msapplication-config');

    return node;
}

function HtmlMsApplicationConfig(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlMsApplicationConfig, HtmlRelation);

extendWithGettersAndSetters(HtmlMsApplicationConfig.prototype, {
    get href() {
        return this.node.getAttribute('content');
    },

    set href(href) {
        this.node.setAttribute('content', href);
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = getNode(this, asset);
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    attachToHead: function (asset, position, adjacentNode) {
        this.node = getNode(this, asset);
        return HtmlRelation.prototype.attachToHead.call(this, asset, position, adjacentNode);
    }
});

module.exports = HtmlMsApplicationConfig;

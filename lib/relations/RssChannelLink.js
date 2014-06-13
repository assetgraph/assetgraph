var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function RssChannelLink(config) {
    Relation.call(this, config);
}

util.inherits(RssChannelLink, Relation);

extendWithGettersAndSetters(RssChannelLink.prototype, {
    get href() {
        return this.node.textContent;
    },

    set href(href) {
        this.node.textContent = href;
    },

    inline: function () {
        throw new Error('RssChannelLink.inline: Not implemented');
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error('RssChannelLink.attach: Not implemented');
    }
});

module.exports = RssChannelLink;

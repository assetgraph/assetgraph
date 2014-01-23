var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlEdgeSideInclude(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlEdgeSideInclude, HtmlRelation);

extendWithGettersAndSetters(HtmlEdgeSideInclude.prototype, {
    get href() {
        return this.node.getAttribute('src');
    },

    set href(href) {
        this.node.setAttribute('src', href);
    },

    inline: function () {
        throw new Error('HtmlEdgeSideInclude.inline(): Not implemented yet.');
    },

    attach: function (asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('esi:include');
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);
        return HtmlRelation.prototype.attach.call(this, asset, position, adjacentRelation);
    }
});

module.exports = HtmlEdgeSideInclude;

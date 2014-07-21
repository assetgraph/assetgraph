var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function HtmlCacheManifest(config) {
    HtmlRelation.call(this, config);
}

util.inherits(HtmlCacheManifest, HtmlRelation);

extendWithGettersAndSetters(HtmlCacheManifest.prototype, {
    get href() {
        var content = this.node.getAttribute('content'),
            matchContent = typeof content === 'string' && content.match(/url=\s*(.*?)\s*$/i);
        if (matchContent) {
            return matchContent[1];
        }
    },

    set href(href) {
        this.node.setAttribute('content', this.node.getAttribute('content').replace(/url=.*?/i, 'url=' + href));
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented');
    }
});

module.exports = HtmlCacheManifest;

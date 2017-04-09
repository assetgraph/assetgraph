var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
    Relation = require('./Relation');

function JavaScriptStaticUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptStaticUrl, Relation);

extendWithGettersAndSetters(JavaScriptStaticUrl.prototype, {
    get href() {
        return this.argumentNode.value;
    },

    set href(href) {
        if (this.from && this.from.assetGraph && /^file:/.test(this.from.assetGraph.root) && href.indexOf(this.from.assetGraph.root) === 0) {
            // Hack: Force a root-relative url instead of an absolute file url
            // when eg. pointing back into the root from eg. a CDN and we
            // don't know the canonical root:
            href = '/' + href.substr(this.from.assetGraph.root.length);
        }
        this.argumentNode.value = href;
    },

    inline: function () {
        throw new Error('Not implemented');
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented');
    },

    omitFunctionCall: function () {
        replaceDescendantNode(this.parentNode, this.node, this.argumentNode);
        this.from.markDirty();
    }
});

module.exports = JavaScriptStaticUrl;

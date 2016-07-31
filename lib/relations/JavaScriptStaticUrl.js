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

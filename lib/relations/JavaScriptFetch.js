var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
    Relation = require('./Relation');

function JavaScriptFetch(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptFetch, Relation);

extendWithGettersAndSetters(JavaScriptFetch.prototype, {
    get href() {
        return this.node.value;
    },

    set href(href) {
        this.node.value = href;
    },

    inline: function () {
        var that = this;
        Relation.prototype.inline.call(that);
        var newNode = { type: 'Literal', value: that.to.dataUrl };
        replaceDescendantNode(that.parentNode, that.node, newNode);
        that.node = newNode;
        that.from.markDirty();
        return that;
    },

    attach: function () {
        throw new Error('JavaScriptFetch.attach(): Not implemented');
    },

    detach: function () {
        this.parentNode.body.splice(this.parentNode.body.indexOf(this.detachableNode), 1);

        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptFetch;

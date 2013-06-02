var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptSourceUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptSourceUrl, Relation);

extendWithGettersAndSetters(JavaScriptSourceUrl.prototype, {
    get href() {
        return this.node.value.match(/@\s*sourceURL=([^\s]*)/)[1];
    },

    set href(href) {
        this.node.value = this.node.value.replace(/(@\s*sourceURL=)[^\s]*/, "$1" + href);
    },

    inline: function () {
        throw new Error("JavaScriptSourceUrl.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptSourceUrl.attach(): Not supported");
    },

    detach: function () {
        this.node.value = this.node.value.replace(/@\s*sourceURL=([^\s]*)/, '');
        this.node = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptSourceUrl;

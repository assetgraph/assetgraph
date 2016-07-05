var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptStaticUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptStaticUrl, Relation);

extendWithGettersAndSetters(JavaScriptStaticUrl.prototype, {
    get href() {
        return this.node.value;
    },

    set href(href) {
        this.node.value = href;
    },

    inline: function () {
        throw new Error('Not implemented');
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented');
    }
});

module.exports = JavaScriptStaticUrl;

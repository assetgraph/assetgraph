var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptWebWorker(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptWebWorker, Relation);

extendWithGettersAndSetters(JavaScriptWebWorker.prototype, {
    get href() {
        return this.node.value;
    },

    set href(href) {
        this.node.value = href;
    },

    inline: function () {
        throw new Error('JavaScriptWebWorker.inline(): Not supported');
    },

    attach: function () {
        throw new Error('JavaScriptWebWorker.attach(): Not supported');
    },

    detach: function () {
        throw new Error('JavaScriptWebWorker.detach(): Not supported');
    }
});

module.exports = JavaScriptWebWorker;

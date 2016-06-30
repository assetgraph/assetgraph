var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptImportScripts(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptImportScripts, Relation);

extendWithGettersAndSetters(JavaScriptImportScripts.prototype, {
    get href() {
        return this.node.value;
    },

    set href(href) {
        this.node.value = href;
    },

    inline: function () {
        throw new Error('JavaScriptImportScripts.inline(): Not supported');
    },

    attach: function () {
        throw new Error('JavaScriptImportScripts.attach(): Not supported');
    },

    detach: function () {
        var i = this.argumentsNode.indexOf(this.node);
        if (i === -1) {
            throw new Error('relations.JavaScriptWebWorker.detach: this.node not found in module array of this.arrayNode.');
        }
        this.argumentsNode.splice(i, 1);
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptImportScripts;

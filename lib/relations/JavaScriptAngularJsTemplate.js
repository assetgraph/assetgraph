var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptAngularJsTemplate(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptAngularJsTemplate, Relation);

extendWithGettersAndSetters(JavaScriptAngularJsTemplate.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        this.node.key = {type: 'Identifier', name: 'template' };
        this.node.value.value = this.to.text;
        Relation.prototype.inline.call(this);
        this.from.markDirty();
        return this;
    },

    set href(href) {
        this.node.value.value = href;
    },

    get href() {
        return this.node.value.value;
    },

    attach: function () {
        throw new Error('JavaScriptAngularJsTemplate.attach: Not implemented');
    },

    detach: function () {
        throw new Error('JavaScriptAngularJsTemplate.detach: Not implemented');
    }
});

module.exports = JavaScriptAngularJsTemplate;

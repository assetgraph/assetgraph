var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptAngularJsTemplateCacheAssignment(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptAngularJsTemplateCacheAssignment, Relation);

extendWithGettersAndSetters(JavaScriptAngularJsTemplateCacheAssignment.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        this.node.body.args[1].value = this.to.text;
        Relation.prototype.inline.call(this);
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('JavaScriptAngularJsTemplateCacheAssignment.attach: Not implemented');
    },

    detach: function () {
        var parentNodeIndex = this.parentNode.indexOf(this.node);
        if (parentNodeIndex === -1) {
            throw new Error('relations.JavaScriptAngularJsTemplateCacheAssignment.detach: this.node not a child of this.parentNode.');
        }
        this.parentNode.splice(parentNodeIndex, 1);
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptAngularJsTemplateCacheAssignment;

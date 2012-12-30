/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptAngularJsTemplateCacheAssignment(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptAngularJsTemplateCacheAssignment, Relation);

extendWithGettersAndSetters(JavaScriptAngularJsTemplateCacheAssignment.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        this.node[1][2][1][1] = this.to.text;
        Relation.prototype.inline.call(this);
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptAngularJsTemplateCacheAssignment.attach: Not implemented");
    },

    detach: function () {
        var parentNodeIndex = this.parentNode.indexOf(this.node);
        if (parentNodeIndex === -1) {
            throw new Error("relations.JavaScriptAngularJsTemplateCacheAssignment.detach: this.node not a child of this.parentNode.");
        }
        this.parentNode.splice(parentNodeIndex, 1);
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptAngularJsTemplateCacheAssignment;

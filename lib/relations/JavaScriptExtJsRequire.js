/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptExtJsRequire(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptExtJsRequire, Relation);

extendWithGettersAndSetters(JavaScriptExtJsRequire.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    inline: function () {
        throw new Error("JavaScriptExtJsRequire.inline(): Not supported.");
    },

    get href() {
        return this.node[1][2][0][1];
    },

    set href(href) {
        this.node[1][2][0][1] = href;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        if (this.extRequireStatNode) {
            var parameters = this.extRequireStatNode[1][2];
            if (parameters.length === 2 && parameters[0] === this.node && parameters[1][0] === 'function') {
                // Substitute Ext.require('Foo.Bar', function () {}) => Ext.require([], function (){})
                // Must keep the array there, Ext.require(function () {}) doesn't work
                parameters.splice(0, 1, ['array', []]);
            } else if (parameters.length === 1 && (parameters[0][0] === 'string' || parameters[0][0] === 'array' && parameters[0][0][1].length === 1)) {
                // The only relation left (and no trailing function), remove the entire Ext.require statement
                this.extRequireStatParentNode.splice(this.extRequireStatParentNode.indexOf(this.extRequireStatNode), 1);
            } else if (parameters.length === 2 && parameters[1][0] === 'function' && parameters[0][0] === 'array') {
                // Must keep the array there, Ext.require(function () {}) doesn't work
                parameters[0][1].splice(parameters[0][1].indexOf(this.node), 1);
            } else if (parameters.length > 2 && parameters.indexOf(this.node) !== -1) {
                parameters.splice(parameters.indexOf(this.node, 1));
            }
            // Else give up, people shouldn't do Ext.require([...], [...], function (){}) anyway
            delete this.extRequireStatNode;
        } else {
            // FIXME: Implement detach from Ext.define({requires:...}) (not imperative, but would be nice).
        }
        delete this.node;
        delete this.parentNode;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptExtJsRequire;

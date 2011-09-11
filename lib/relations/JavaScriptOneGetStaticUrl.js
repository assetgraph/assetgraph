/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    uglifyAst = require('../util/uglifyAst'),
    Relation = require('./Relation');

function JavaScriptOneGetStaticUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptOneGetStaticUrl, Relation);

extendWithGettersAndSetters(JavaScriptOneGetStaticUrl.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        this.node[2] = [this.to.toAst()];
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        throw new Error("Not implemented");
    }
});

module.exports = JavaScriptOneGetStaticUrl;

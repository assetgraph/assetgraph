/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptGetStaticUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptGetStaticUrl, Relation);

extendWithGettersAndSetters(JavaScriptGetStaticUrl.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        var ast = this.to.toAst();
        this.node.args = this.to.toAst();
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

module.exports = JavaScriptGetStaticUrl;

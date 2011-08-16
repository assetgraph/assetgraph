/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    uglifyAst = require('../util/uglifyAst'),
    Base = require('./Base');

function JavaScriptOneGetStaticUrl(config) {
    Base.call(this, config);
}

util.inherits(JavaScriptOneGetStaticUrl, Base);

extendWithGettersAndSetters(JavaScriptOneGetStaticUrl.prototype, {
    _inline: function () {
        this.node[2] = [this.to.toAst()];
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        throw new Error("Not implemented");
    }
});

module.exports = JavaScriptOneGetStaticUrl;

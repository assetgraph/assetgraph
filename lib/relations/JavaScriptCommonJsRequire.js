/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptCommonJsRequire(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptCommonJsRequire, Relation);

extendWithGettersAndSetters(JavaScriptCommonJsRequire.prototype, {
    get href() {
        return this.node[2][0][1];
    },

    set href(href) {
        this.node[2][0][1] = href;
    },

    inline: function () {
        throw new Error("JavaScriptCommonJsRequire.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("JavaScriptCommonJsRequire.attach(): Not supported");
    },

    detach: function () {
        throw new Error("JavaScriptCommonJsRequire.detach(): Not supported");
    }
});

module.exports = JavaScriptCommonJsRequire;

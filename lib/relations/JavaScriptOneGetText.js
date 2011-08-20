/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    query = require('../query'),
    Relation = require('./Relation');

function JavaScriptOneGetText(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptOneGetText, Relation);

extendWithGettersAndSetters(JavaScriptOneGetText.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    get href() {
        return this.node[2][0][1];
    },

    set href(href) {
        this.node[2][0][1] = href;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        throw new Error("Not implemented, one.getText is expression level");
    }
});

module.exports = JavaScriptOneGetText;

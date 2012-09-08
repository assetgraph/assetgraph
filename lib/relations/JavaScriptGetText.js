/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptGetText(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptGetText, Relation);

extendWithGettersAndSetters(JavaScriptGetText.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    inline: function () {
        Relation.prototype.inline.call(this);
        if (!this.to.isText) {
            throw new Error('JavaScriptGetText.inline: Cannot inline non-text asset: ' + this.to);
        }
        this.node.splice(0, this.node.length, 'string', this.to.text);
        this.from.markDirty();
        return this;
    },

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
        throw new Error("Not implemented, GETTEXT is expression level");
    }
});

module.exports = JavaScriptGetText;

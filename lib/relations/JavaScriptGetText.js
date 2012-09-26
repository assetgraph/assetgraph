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

    set href(href) {
        this.node.splice(0, this.node.length, 'call', ['name', 'GETTEXT'], [['string', href]]);
    },

    get href() {
        if (this.node[0] === 'call' && this.node[1][0] === 'name' && this.node[1][1] === 'GETTEXT' && this.node[2].length > 0 && this.node[2][0][0] === 'string') {
            return this.node[2][0][1];
        }
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        throw new Error("Not implemented, GETTEXT is expression level");
    }
});

module.exports = JavaScriptGetText;

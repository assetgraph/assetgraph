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
    inline: function () {
        Relation.prototype.inline.call(this);
        if (!this.to.isText) {
            throw new Error('JavaScriptTrHtml.inline: Cannot inline non-text asset: ' + this.to);
        }
        this.node[2][0] = ['string', this.to.text];
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        throw new Error("Not implemented, TRHTML is expression level");
    }
});

module.exports = JavaScriptGetText;

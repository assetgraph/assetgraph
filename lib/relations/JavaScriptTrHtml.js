/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptTrHtml(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptTrHtml, Relation);

extendWithGettersAndSetters(JavaScriptTrHtml.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        var that = this;
        Relation.prototype.inline.call(that);
        if (!that.to.isText) {
            throw new Error('JavaScriptTrHtml.inline: Cannot inline non-text asset: ' + that.to);
        }
        var ast;
        if (that.omitFunctionCall) {
            that.node.splice(0, that.node.length, 'string', that.to.text);
        } else {
            that.node.splice(0, that.node.length, 'call', ['name', 'TRHTML'], [['string', that.to.text]]);
        }
        that.parentNode.transform(new uglifyJs.TreeTransformer(null, function (node) {
            if (node === that.node) {
                return that.node = ast;
            }
        }));
        that.from.markDirty();
        return that;
    },

    set href(href) {
        this.node.splice(0, this.node.length, 'call', ['name', 'TRHTML'], [['call', ['name', 'GETTEXT'], [['string', href]]]]);
    },

    get href() {
        if (this.node[0] === 'call' && this.node[1][0] === 'name' && this.node[1][1] === 'TRHTML' && this.node[2].length > 0 &&
            this.node[2][0][0] === 'call' && this.node[2][0][1][0] === 'name' && this.node[2][0][1][1] === 'GETTEXT' && this.node[2][0][2].length > 0 && this.node[2][0][2][0][0] === 'string') {

            return this.node[2][0][2][0][1];
        }
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        throw new Error("Not implemented, TRHTML is expression level");
    }
});

module.exports = JavaScriptTrHtml;

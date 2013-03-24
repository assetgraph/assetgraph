/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    uglifyJs = require('uglify-js'),
    Relation = require('./Relation');

function JavaScriptGetText(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptGetText, Relation);

extendWithGettersAndSetters(JavaScriptGetText.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        var that = this;
        Relation.prototype.inline.call(that);
        if (!that.to.isText) {
            throw new Error('JavaScriptGetText.inline: Cannot inline non-text asset: ' + that.to);
        }
        that.parentNode.transform(new uglifyJs.TreeTransformer(null, function (node) {
            if (node === that.node) {
                that.node = new uglifyJs.AST_String({
                    start: node.start,
                    end: node.end,
                    value: that.to.text
                });
                return that.node;
            }
        }));
        that.from.markDirty();
        return that;
    },

    set href(href) {
        var that = this;
        if (that.node instanceof uglifyJs.AST_Call) {
            that.node.args[0].value = href;
        } else {
            // Convert inlined relation back to GETTEXT('...')
            // The two should probably be separate relation types
            that.parentNode.transform(new uglifyJs.TreeTransformer(null, function (node) {
                if (node === that.node) {
                    that.node = new uglifyJs.AST_Call({
                        start: that.node.start,
                        end: that.node.end,
                        expression: new uglifyJs.AST_SymbolRef({name: 'GETTEXT'}),
                        args: [
                            new uglifyJs.AST_String({value: href})
                        ]
                    });
                    return that.node;
                }
            }));
        }
    },

    get href() {
        if (this.node instanceof uglifyJs.AST_Call) {
            return this.node.args[0].value;
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

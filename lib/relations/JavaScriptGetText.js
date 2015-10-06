var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
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
        var newNode = { type: 'Literal', value: that.to.text };
        replaceDescendantNode(that.parentNode, that.node, newNode);
        that.node = newNode;
        that.from.markDirty();
        return that;
    },

    set href(href) {
        var that = this;
        if (that.node.type === 'CallExpression') {
            that.node.arguments[0].value = href;
        } else {
            // Convert inlined relation back to GETTEXT('...')
            // The two should probably be separate relation types
            var newNode = {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'GETTEXT' },
                arguments: [
                    { type: 'Literal', value: href }
                ]
            };
            replaceDescendantNode(that.parentNode, that.node, newNode);
            that.node = newNode;
        }
    },

    get href() {
        if (this.node.type === 'CallExpression') {
            return this.node.arguments[0].value;
        }
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented, GETTEXT is expression level');
    }
});

module.exports = JavaScriptGetText;

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
    Relation = require('./Relation');

function JavaScriptGetStaticUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptGetStaticUrl, Relation);

extendWithGettersAndSetters(JavaScriptGetStaticUrl.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        var newNode;
        if (this.omitFunctionCall) {
            newNode = this.to.toAst();
        } else {
            if (this.node.type === 'CallExpression') {
                this.node.arguments = [this.to.toAst()];
            } else {
                newNode = {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: 'GETSTATICURL'
                    },
                    arguments: [this.to.toAst()]
                };
            }
        }
        if (newNode) {
            replaceDescendantNode(this.parentNode, this.node, newNode);
            this.node = newNode;
        }
        this.from.markDirty();
        return this;
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented');
    }
});

module.exports = JavaScriptGetStaticUrl;

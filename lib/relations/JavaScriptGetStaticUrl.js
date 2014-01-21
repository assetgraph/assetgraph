var util = require('util'),
    JavaScript = require('../assets/JavaScript'),
    uglifyJs = JavaScript.uglifyJs,
    uglifyAst = JavaScript.uglifyAst,
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
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
            if (this.node instanceof uglifyJs.AST_Call) {
                this.node.args = [this.to.toAst()];
            } else {
                newNode = new uglifyJs.AST_Call({
                    expression: new uglifyJs.AST_SymbolRef({
                        name: 'GETSTATICURL'
                    }),
                    args: [this.to.toAst()]
                });
            }
        }
        if (newNode) {
            uglifyAst.replaceDescendantNode(this.parentNode, this.node, newNode);
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

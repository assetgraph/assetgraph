var util = require('util'),
    JavaScript = require('../assets/JavaScript'),
    uglifyJs = JavaScript.uglifyJs,
    uglifyAst = JavaScript.uglifyAst,
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptTrHtml(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptTrHtml, Relation);

extendWithGettersAndSetters(JavaScriptTrHtml.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false},

    inline: function () {
        Relation.prototype.inline.call(this);
        if (!this.to.isText) {
            throw new Error('JavaScriptTrHtml.inline: Cannot inline non-text asset: ' + this.to);
        }
        var newNode;
        if (this.omitFunctionCall) {
            newNode = new uglifyJs.AST_String({value: this.to.text});
        } else {
            newNode = new uglifyJs.AST_Call({
                expression: new uglifyJs.AST_SymbolRef({name: 'TRHTML'}),
                args: [new uglifyJs.AST_String({value: this.to.text})]
            });
        }
        uglifyAst.replaceDescendantNode(this.parentNode, this.node, newNode);
        this.node = newNode;
        this.from.markDirty();
        return this;
    },

    set href(href) {
        if (this.node instanceof uglifyJs.AST_Call &&
            this.node.expression instanceof uglifyJs.AST_SymbolRef &&
            this.node.expression.name === 'TRHTML' &&
            this.node.args.length === 1 &&
            this.node.args[0] instanceof uglifyJs.AST_Call &&
            this.node.args[0].expression instanceof uglifyJs.AST_SymbolRef &&
            this.node.args[0].expression.name === 'GETTEXT' &&
            this.node.args[0].args[0] instanceof uglifyJs.AST_String) {

            this.node.args[0].args[0].value = href;
        } else {
            var newNode = new uglifyJs.AST_Call({
                expression: new uglifyJs.AST_SymbolRef({name: 'TRHTML'}),
                args: [
                    new uglifyJs.AST_Call({
                        expression: new uglifyJs.AST_SymbolRef({name: 'GETTEXT'}),
                        args: [new uglifyJs.AST_String({value: href})]
                    })
                ]
            });
            uglifyAst.replaceDescendantNode(this.parentNode, this.node, newNode);
            this.node = newNode;
        }
    },

    get href() {
        if (this.node instanceof uglifyJs.AST_Call &&
            this.node.expression instanceof uglifyJs.AST_SymbolRef &&
            this.node.expression.name === 'TRHTML' &&
            this.node.args.length === 1 &&
            this.node.args[0] instanceof uglifyJs.AST_Call &&
            this.node.args[0].expression instanceof uglifyJs.AST_SymbolRef &&
            this.node.args[0].expression.name === 'GETTEXT' &&
            this.node.args[0].args[0] instanceof uglifyJs.AST_String) {

            return this.node.args[0].args[0].value;
        }
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented, TRHTML is expression level');
    }
});

module.exports = JavaScriptTrHtml;

var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScript = require('../assets/JavaScript'),
    uglifyJs = JavaScript.uglifyJs,
    uglifyAst = JavaScript.uglifyAst,
    Relation = require('./Relation'),
    AssetGraph = require('../');

function JavaScriptRequireJsToUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptRequireJsToUrl, Relation);

extendWithGettersAndSetters(JavaScriptRequireJsToUrl.prototype, {
    baseAssetQuery: AssetGraph.query.or(
        {type: 'Html', isInline: false, isFragment: false},
        {type: 'JavaScript', isInline: false} // Assumes that the require is not the global one when it's found in an external file
    ),

    inline: function () {
        throw new Error('Not implemented');
    },

    set href(href) {
        var that = this;
        if (that.node instanceof uglifyJs.AST_Call) {
            that.node.args[0].value = href;
        } else {
            // Convert inlined relation back to require.toUrl('...')
            // The two should probably be separate relation types
            var newNode = new uglifyJs.AST_Call({
                expression: new uglifyJs.AST_Dot({
                    property: 'toUrl',
                    expression: new uglifyJs.AST_SymbolRef({name: 'require'})
                }),
                args: [
                    new uglifyJs.AST_String({value: href})
                ]
            });
            uglifyAst.replaceDescendantNode(that.parentNode, that.node, newNode);
            that.node = newNode;
        }
    },

    get href() {
        if (this.node instanceof uglifyJs.AST_Call) {
            return this.node.args[0].value;
        }
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented, GETTEXT is expression level');
    }
});

module.exports = JavaScriptRequireJsToUrl;

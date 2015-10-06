var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
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
            newNode = { type: 'Literal', value: this.to.text };
        } else {
            newNode = {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'TRHTML' },
                arguments: [ { type: 'Literal', value: this.to.text } ]
            };
        }
        replaceDescendantNode(this.parentNode, this.node, newNode);
        this.node = newNode;
        this.from.markDirty();
        return this;
    },

    set href(href) {
        if (this.node.type === 'CallExpression' &&
            this.node.callee.type === 'Identifier' &&
            this.node.callee.name === 'TRHTML' &&
            this.node.arguments.length === 1 &&
            this.node.arguments[0].type === 'CallExpression' &&
            this.node.arguments[0].callee.type === 'Identifier' &&
            this.node.arguments[0].callee.name === 'GETTEXT' &&
            this.node.arguments[0].arguments[0].type === 'Literal' &&
            typeof this.node.arguments[0].arguments[0].value === 'string') {

            this.node.arguments[0].arguments[0].value = href;
        } else {
            var newNode = {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'TRHTML' },
                arguments: [
                    {
                        type: 'CallExpression',
                        callee: { type: 'Identifier', name: 'GETTEXT' },
                        arguments: [ { type: 'Literal', value: href } ]
                    }
                ]
            };
            replaceDescendantNode(this.parentNode, this.node, newNode);
            this.node = newNode;
        }
    },

    get href() {
        if (this.node.type === 'CallExpression' &&
            this.node.callee.type === 'Identifier' &&
            this.node.callee.name === 'TRHTML' &&
            this.node.arguments.length === 1 &&
            this.node.arguments[0].type === 'CallExpression' &&
            this.node.arguments[0].callee.type === 'Identifier' &&
            this.node.arguments[0].callee.name === 'GETTEXT' &&
            this.node.arguments[0].arguments[0].type === 'Literal' &&
            typeof this.node.arguments[0].arguments[0].type === 'string') {

            return this.node.arguments[0].arguments[0].value;
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

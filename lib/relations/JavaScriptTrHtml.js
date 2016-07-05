var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    replaceDescendantNode = require('../replaceDescendantNode'),
    Relation = require('./Relation');

function JavaScriptTrHtml(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptTrHtml, Relation);

extendWithGettersAndSetters(JavaScriptTrHtml.prototype, {
    inline: function () {
        Relation.prototype.inline.call(this);
        if (!this.to.isText) {
            throw new Error('JavaScriptTrHtml.inline: Cannot inline non-text asset: ' + this.to);
        }
        if (this.argumentNode.type === 'Literal') {
            this.argumentNode.value = this.to.text;
        } else {
            var newArgumentNode = {
                type: 'Literal',
                value: this.to.text
            };
            replaceDescendantNode(this.parentNode, this.argumentNode, newArgumentNode);
            this.argumentNode = newArgumentNode;
        }
        this.from.markDirty();

        return this;
    },

    set href(href) {
        if (this.argumentNode.type === 'CallExpression' &&
            this.argumentNode.callee.type === 'Identifier' &&
            this.argumentNode.callee.name === 'GETTEXT' &&
            this.argumentNode.arguments[0].type === 'Literal' &&
            typeof this.argumentNode.arguments[0].value === 'string') {

            this.argumentNode.arguments[0].value = href;
        } else {
            var newArgumentNode = {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: 'GETTEXT' },
                arguments: [ { type: 'Literal', value: href } ]
            };
            replaceDescendantNode(this.parentNode, this.argumentNode, newArgumentNode);
            this.argumentNode = newArgumentNode;
        }
    },

    get href() {
        if (this.argumentNode.type === 'CallExpression' &&
            this.argumentNode.callee.type === 'Identifier' &&
            this.argumentNode.callee.name === 'GETTEXT' &&
            this.argumentNode.arguments[0].type === 'Literal' &&
            typeof this.argumentNode.arguments[0].type === 'string') {

            return this.argumentNode.arguments[0].value;
        }
    },

    attach: function () {
        throw new Error('Not implemented');
    },

    detach: function () {
        throw new Error('Not implemented');
    },

    omitFunctionCall: function () {
        replaceDescendantNode(this.parentNode, this.node, this.argumentNode);
        this.from.markDirty();
    }
});

module.exports = JavaScriptTrHtml;

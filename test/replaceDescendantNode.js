/*global describe, it*/
var replaceDescendantNode = require('../lib/replaceDescendantNode');
var esprima = require('esprima');
var escodegen = require('escodegen');
var expect = require('./unexpected-with-plugins');

describe('replaceDescendantNode', function () {
    it('should replace oldNode with newNode in an AST', function () {
        var ast = esprima.parse('var foo = 123 + 456;');
        var oldNode = ast.body[0].declarations[0].init.right;
        replaceDescendantNode(ast, oldNode, {
            type: 'Literal',
            value: true
        });

        expect(escodegen.generate(ast), 'to equal', 'var foo = 123 + true;');
    });
});

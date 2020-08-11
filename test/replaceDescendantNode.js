const replaceDescendantNode = require('../lib/replaceDescendantNode');
const parseJavaScript = require('../lib/parseJavaScript');
const escodegen = require('escodegen');
const expect = require('./unexpected-with-plugins');

describe('replaceDescendantNode', function () {
  it('should replace oldNode with newNode in an AST', function () {
    const ast = parseJavaScript('var foo = 123 + 456;');
    const oldNode = ast.body[0].declarations[0].init.right;
    replaceDescendantNode(ast, oldNode, {
      type: 'Literal',
      value: true,
    });

    expect(escodegen.generate(ast), 'to equal', 'var foo = 123 + true;');
  });
});

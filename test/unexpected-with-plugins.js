const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-dom'))
  .use(require('unexpected-set'))
  .use(require('unexpected-assetgraph'))
  .use(require('magicpen-prism'));

const parseJavaScript = require('../lib/parseJavaScript');
const escodegen = require('escodegen');

function toAst(stringOrAssetOrFunctionOrAst) {
  if (typeof stringOrAssetOrFunctionOrAst === 'string') {
    return parseJavaScript(stringOrAssetOrFunctionOrAst);
  } else if (stringOrAssetOrFunctionOrAst.isAsset) {
    return stringOrAssetOrFunctionOrAst.parseTree;
  } else if (typeof stringOrAssetOrFunctionOrAst === 'function') {
    return {
      type: 'Program',
      body: parseJavaScript(`!${stringOrAssetOrFunctionOrAst.toString()}`)
        .body[0].expression.argument.body.body
    };
  } else {
    return stringOrAssetOrFunctionOrAst;
  }
}

function prettyPrintAst(ast) {
  return escodegen.generate(ast);
}

expect.addAssertion(
  '<object|string|function|AssetGraph.asset> [not] to have the same AST as <object|string|function|AssetGraph.asset>',
  function(expect, subject, value) {
    expect(
      prettyPrintAst(toAst(subject)),
      '[not] to equal',
      prettyPrintAst(toAst(value))
    );
  }
);

module.exports = expect;

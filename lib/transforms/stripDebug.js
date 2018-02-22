const estraverse = require('estraverse-fb');
const replaceDescendantNode = require('../replaceDescendantNode');

module.exports = queryObj => {
  return function stripDebug(assetGraph) {
    for (const javaScript of assetGraph.findAssets(
      Object.assign({ type: 'JavaScript' }, queryObj)
    )) {
      const isInScopeByIdentifierName = {};
      estraverse.traverse(javaScript.parseTree, {
        enter(node, parentNode) {
          if (
            node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration'
          ) {
            for (const param of node.params) {
              if (param.type === 'Identifier') {
                isInScopeByIdentifierName[param.name] =
                  isInScopeByIdentifierName[param.name] || 0;
                isInScopeByIdentifierName[param.name] += 1;
              }
            }
          } else if (
            node.type === 'ExpressionStatement' &&
            node.expression.type === 'CallExpression' &&
            node.expression.callee.type === 'MemberExpression' &&
            node.expression.callee.object.type === 'Identifier' &&
            node.expression.callee.object.name === 'console' &&
            !isInScopeByIdentifierName.console
          ) {
            replaceDescendantNode(parentNode, node, { type: 'EmptyStatement' });
          } else if (node.type === 'DebuggerStatement') {
            replaceDescendantNode(parentNode, node, { type: 'EmptyStatement' });
          }
        },
        leave(node) {
          if (
            node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration'
          ) {
            for (const param of node.params) {
              if (param.type === 'Identifier') {
                isInScopeByIdentifierName[param.name] =
                  isInScopeByIdentifierName[param.name] || 0;
                isInScopeByIdentifierName[param.name] -= 1;
              }
            }
          }
        }
      });
    }
  };
};

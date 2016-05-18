var _ = require('lodash');
var estraverse = require('estraverse');
var replaceDescendantNode = require('assetgraph/lib/replaceDescendantNode');

module.exports = function (queryObj) {
    return function stripDebug(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var isInScopeByIdentifierName = {};
            estraverse.traverse(javaScript.parseTree, {
                enter: function (node, parentNode) {
                    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                        node.params.forEach(function (param) {
                            if (param.type === 'Identifier') {
                                isInScopeByIdentifierName[param.name] = isInScopeByIdentifierName[param.name] || 0;
                                isInScopeByIdentifierName[param.name] += 1;
                            }
                        });
                    } else if (node.type === 'ExpressionStatement' &&
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
                leave: function (node) {
                    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
                        node.params.forEach(function (param) {
                            if (param.type === 'Identifier') {
                                isInScopeByIdentifierName[param.name] = isInScopeByIdentifierName[param.name] || 0;
                                isInScopeByIdentifierName[param.name] -= 1;
                            }
                        });
                    }
                }
            });
        });
    };
};

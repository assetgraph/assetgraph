var _ = require('lodash');
var AssetGraph = require('../');

module.exports = function (queryObj) {
    return function liftUpJavaScriptRequireJsCommonJsCompatibilityRequire(assetGraph) {
        assetGraph.findRelations(_.extend({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}, queryObj)).forEach(function (relation) {
            // Mostly copied from JavaScript.findOutgoingRelationsInParseTree:
            var node = relation.parentDefineNode,
                arrayNode;
            if (node.arguments.length === 3 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string' && node.arguments[1].type === 'ArrayExpression') {
                arrayNode = node.arguments[1];
            } else if (node.arguments.length === 2 && node.arguments[0].type === 'ArrayExpression') {
                arrayNode = node.arguments[0];
            }
            if (!arrayNode) {
                arrayNode = { type: 'ArrayExpression', elements: [] };
                var definitionFunction = node.arguments[node.arguments.length - 1];
                if (definitionFunction.type === 'FunctionExpression') {
                    ['require', 'exports', 'module'].forEach(function (moduleName, i) {
                        if (definitionFunction.params.length >= i && definitionFunction.params[i] && definitionFunction.params[i].name === moduleName) {
                            arrayNode.elements.push({ type: 'Literal', value: moduleName });
                        }
                    });
                }
                if (node.type === 'Literal' && typeof node.arguments[0].value === 'string') {
                    node.arguments.splice(1, 0, arrayNode);
                } else {
                    node.arguments.unshift(arrayNode);
                }
            }
            var arrayItemAst = { type: 'Literal', value: relation.rawHref };
            arrayNode.elements.push(arrayItemAst);
            relation.from.markDirty();

            var javaScriptAmdDefine = new AssetGraph.JavaScriptAmdDefine({
                requireJsConfig: assetGraph.requireJsConfig,
                callNode: node,
                arrayNode: arrayNode,
                node: arrayItemAst,
                from: relation.from,
                to: relation.to
            });

            assetGraph.addRelation(javaScriptAmdDefine, 'first'); // I don't think the order will matter for these
        });
        assetGraph.recomputeBaseAssets(true);
    };
};

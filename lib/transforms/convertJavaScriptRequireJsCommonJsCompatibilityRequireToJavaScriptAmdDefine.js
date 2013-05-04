var _ = require('underscore'),
    AssetGraph = require('../AssetGraph'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs;

module.exports = function (queryObj) {
    return function convertJavaScriptRequireJsCommonJsCompatibilityRequireToJavaScriptAmdDefine(assetGraph) {
        assetGraph.findRelations(_.extend({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}, queryObj)).forEach(function (relation) {
            // Mostly copied from JavaScript.findOutgoingRelationsInParseTree:
            var node = relation.parentDefineNode,
                arrayNode;
            if (node.args.length === 3 && node.args[0] instanceof uglifyJs.AST_String && node.args[1] instanceof uglifyJs.AST_Array) {
                arrayNode = node.args[1];
            } else if (node.args.length === 2 && node.args[0] instanceof uglifyJs.AST_Array) {
                arrayNode = node.args[0];
            }
            if (!arrayNode) {
                arrayNode = new uglifyJs.AST_Array({elements: []});
                var definitionFunction = node.args[node.args.length - 1];
                if (definitionFunction instanceof uglifyJs.AST_Function) {
                    ['require', 'exports', 'module'].forEach(function (moduleName, i) {
                        if (definitionFunction.argnames.length >= i && definitionFunction.argnames[i].name === moduleName) {
                            arrayNode.elements.push(new uglifyJs.AST_String({value: moduleName}));
                        }
                    });
                }
                if (node.args[0] instanceof uglifyJs.AST_String) {
                    node.args.splice(1, 0, arrayNode);
                } else {
                    node.args.unshift(arrayNode);
                }
            }
            var arrayItemAst = new uglifyJs.AST_String({value: relation.href});
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
            assetGraph.removeRelation(relation);
        });
        assetGraph.recomputeBaseAssets(true);
    };
};

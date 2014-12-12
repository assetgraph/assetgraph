var _ = require('lodash'),
    JavaScript = require('../assets/JavaScript'),
    uglifyJs = JavaScript.uglifyJs;

module.exports = function (queryObj) {
    return function removeDeadIfsInJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var statementArraysToCleanUp = [],
                treeWalker = new uglifyJs.TreeWalker(function before(node, descend) {
                    if (node instanceof uglifyJs.AST_If && !node.alternative) {
                        var parentNode = treeWalker.parent();
                        if (node.condition instanceof uglifyJs.AST_True ||
                            (node.condition instanceof uglifyJs.AST_Binary && node.condition.operator === '===' &&
                            node.condition.left instanceof uglifyJs.AST_String && node.condition.right instanceof uglifyJs.AST_String &&
                            node.condition.left.value === node.condition.right.value)) {
                            descend();
                            Array.prototype.splice.apply(parentNode.body, [parentNode.body.indexOf(node), 1].concat(node.body));
                            statementArraysToCleanUp.push(parentNode.body);
                            return true;
                        } else if (node.condition instanceof uglifyJs.AST_False ||
                            (node.condition instanceof uglifyJs.AST_Binary && node.condition.operator === '===' &&
                            node.condition.left instanceof uglifyJs.AST_String && node.condition.right instanceof uglifyJs.AST_String &&
                            node.condition.left.value !== node.condition.right.value)) {

                            // "Tombstone" to remove in next pass
                            parentNode.body[parentNode.body.indexOf(node)] = new uglifyJs.AST_EmptyStatement();
                            statementArraysToCleanUp.push(parentNode.body);
                            return true;
                        }
                    }
                    descend();
                    return true;
                });
            javaScript.parseTree.walk(treeWalker);

            if (statementArraysToCleanUp.length > 0) {
                _.unique(statementArraysToCleanUp.reverse()).forEach(function (statementArray) {
                    for (var i = 0 ; i < statementArray.length ; i += 1) {
                        if (statementArray[i] instanceof uglifyJs.AST_EmptyStatement) {
                            statementArray.splice(i, 1);
                            i -= 1;
                        } else if (statementArray[i] instanceof uglifyJs.AST_BlockStatement) {
                            var blockBody = statementArray[i].body;
                            Array.prototype.splice.apply(statementArray, [i, 1].concat(blockBody));
                            i -= 1;
                        }
                    }
                });
                javaScript.markDirty();
            }
        });
    };
};

var _ = require('lodash'),
    estraverse = require('estraverse');

module.exports = function (queryObj) {
    return function removeDeadIfsInJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var statementArraysToCleanUp = [];

            estraverse.traverse(javaScript.parseTree, {
                leave: function (node, parentNode) {
                    if (node.type === 'IfStatement' && !node.alternate) {
                        if (Array.isArray(parentNode.body)) {
                            if ((node.test.type === 'Literal' && node.test.value === true) ||
                                (node.test.type === 'BinaryExpression' && node.test.operator === '===' &&
                                node.test.left.type === 'Literal' && node.test.right.type === 'Literal' &&
                                node.test.left.value === node.test.right.value)) {
                                Array.prototype.splice.apply(parentNode.body, [parentNode.body.indexOf(node), 1].concat(node.consequent));
                                statementArraysToCleanUp.push(parentNode.body);
                            } else if ((node.test.type === 'Literal' && node.test.value === false) ||
                                (node.test.type === 'BinaryExpression' && node.test.operator === '===' &&
                                node.test.left.type === 'Literal' && node.test.right.type === 'Literal' &&
                                node.test.left.value !== node.test.right.value)) {

                                // "Tombstone" to remove in next pass
                                parentNode.body[parentNode.body.indexOf(node)] = { type: 'EmptyStatement' };
                                statementArraysToCleanUp.push(parentNode.body);
                            }
                        }
                    }
                }
            });

            if (statementArraysToCleanUp.length > 0) {
                _.unique(statementArraysToCleanUp.reverse()).forEach(function (statementArray) {
                    for (var i = 0 ; i < statementArray.length ; i += 1) {
                        if (statementArray[i].type === 'EmptyStatement') {
                            statementArray.splice(i, 1);
                            i -= 1;
                        } else if (statementArray[i].type === 'BlockStatement') {
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

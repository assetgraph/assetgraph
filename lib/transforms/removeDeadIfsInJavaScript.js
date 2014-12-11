var _ = require('lodash'),
    JavaScript = require('../assets/JavaScript'),
    uglifyJs = JavaScript.uglifyJs;

module.exports = function (queryObj) {
    return function (assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var replacementPerformed = false,
                treeWalker = new uglifyJs.TreeWalker(function before(node, descend) {
                    descend();
                    if (node instanceof uglifyJs.AST_If && !node.alternative) {
                        var parentNode = treeWalker.parent();
                        if (node.condition instanceof uglifyJs.AST_True ||
                            (node.condition instanceof uglifyJs.AST_Binary && node.condition.operator === '===' &&
                            node.condition.left instanceof uglifyJs.AST_String && node.condition.right instanceof uglifyJs.AST_String &&
                            node.condition.left.value === node.condition.right.value)) {

                            Array.prototype.splice.apply(parentNode.body, [parentNode.body.indexOf(node), 1].concat(node.body.body));
                            replacementPerformed = true;
                        } else if (node.condition instanceof uglifyJs.AST_False ||
                            (node.condition instanceof uglifyJs.AST_Binary && node.condition.operator === '===' &&
                            node.condition.left instanceof uglifyJs.AST_String && node.condition.right instanceof uglifyJs.AST_String &&
                            node.condition.left.value !== node.condition.right.value)) {

                            parentNode.body.splice(parentNode.body.indexOf(node), 1);
                            replacementPerformed = true;
                        }
                    }
                });
            javaScript.parseTree.walk(treeWalker);

            if (replacementPerformed) {
                javaScript.markDirty();
            }
        });
    };
};

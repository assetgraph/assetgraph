// Poor man's uglifyjs --define ... intended for use with --nocompress

var _ = require('underscore'),
    uglifyJs = require('../').JavaScript.uglifyJs,
    uglifyAst = require('../').JavaScript.uglifyAst;

function isLeftHandSideOfAssignment(stack) {
    for (var i = stack.length - 2 ; i >= 0 ; i -= 1) {
        if (stack[i] instanceof uglifyJs.AST_Assign) {
            if (stack[i + 1] === stack[i].left) {
                return true;
            } else {
                break;
            }
        }
    }
    return false;
}

function astObjectIndexOfProperty(ast, key) {
    if (ast.properties && ast.properties.length) {
        var index = -1;
        ast.properties.some(function (prop, propIndex) {
            if (prop.key === key) {
                index = propIndex;
                return true;
            }
            return false;
        });
        return index;
    }
    return -1;
}


module.exports = function (queryObj, replacementAstBySymbolName) {
    replacementAstBySymbolName = _.extend({}, replacementAstBySymbolName);
    Object.keys(replacementAstBySymbolName).forEach(function (symbolName) {
        var replacementAst = replacementAstBySymbolName[symbolName];
        if (typeof replacementAst === 'string') {
            replacementAstBySymbolName[symbolName] = uglifyAst.parseExpression(replacementAst);
        } else if (!(replacementAst instanceof uglifyJs.AST_Node)) {
            replacementAstBySymbolName[symbolName] = uglifyAst.objToAst(replacementAst);
        }
    });

    return function replaceSymbolsInJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var replacementPerformed = false;
            javaScript.parseTree.walk(new uglifyJs.TreeWalker(function (node) {
                if (node instanceof uglifyJs.AST_SymbolRef && Object.prototype.hasOwnProperty.call(replacementAstBySymbolName, node.name) && !isLeftHandSideOfAssignment(this.stack)) {

                    var stack = this.stack.reverse();
                    var replacement = node;
                    var originalNode = node;
                    var dontReplace = false;
                    var nonExistentKey = '';
                    var replacedUntil = -1;

                    stack.some(function (node, stackIndex) {
                        var astIndex;
                        replacedUntil = stackIndex;
                        if (originalNode === node) {
                            replacement = replacementAstBySymbolName[node.name].clone();
                            return false;
                        } else if (node instanceof uglifyJs.AST_Dot && replacement !== node) {
                            astIndex = astObjectIndexOfProperty(replacement, node.property);
                            if (astIndex !== -1) {
                                replacement = replacement.properties[astIndex].value;
                                return false; // continue up the stack
                            } else {
                                dontReplace = true;
                                nonExistentKey = node.property;
                            }
                        } else if (node instanceof uglifyJs.AST_Sub && replacement !== node) {
                            astIndex = astObjectIndexOfProperty(replacement, node.property.value);
                            if (astIndex !== -1) {
                                replacement = replacement.properties[astIndex].value;
                                return false; // continue up the stack
                            } else {
                                dontReplace = true;
                                nonExistentKey = node.property.value;
                            }
                        }
                        return true; // stop traversing the stack
                    });

                    if (dontReplace) {
                        assetGraph.emit('warn', new Error(
                            'Trying to replace with non-existent key "' +
                            nonExistentKey + '" on ' + node.print_to_string()
                        ));
                    }

                    if (!dontReplace && replacement !== node) {
                        uglifyAst.replaceDescendantNode(stack[replacedUntil], stack[replacedUntil - 1], replacement);
                        replacementPerformed = true;
                    }
                }
            }));
            if (replacementPerformed) {
                javaScript.markDirty();
            }
        });
    };
};

// Poor man's uglifyjs --define ... intended for use with --nocompress

var _ = require('lodash'),
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
    var nonSymbols = [];
    Object.keys(replacementAstBySymbolName).forEach(function (symbolName) {
        var expression = uglifyAst.parseExpression(symbolName),
            replacementAst = replacementAstBySymbolName[symbolName];
        if (!(replacementAst instanceof uglifyJs.AST_Node)) {
            if (replacementAst && typeof replacementAst === 'object') {
                replacementAst = uglifyAst.objToAst(replacementAst);
            } else {
                replacementAst = uglifyAst.parseExpression(String(replacementAst));
            }
        }
        if (expression instanceof uglifyJs.AST_SymbolRef) {
            replacementAstBySymbolName[expression.name] = replacementAst;
        } else {
            nonSymbols.push({expression: expression, replacementAst: replacementAst});
        }
    });

    return function replaceSymbolsInJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var replacementPerformed = false;
            javaScript.parseTree.walk(new uglifyJs.TreeWalker(function (node) {
                var replacementAst;
                if (node instanceof uglifyJs.AST_SymbolRef && Object.prototype.hasOwnProperty.call(replacementAstBySymbolName, node.name) && !isLeftHandSideOfAssignment(this.stack)) {
                    replacementAst = replacementAstBySymbolName[node.name];
                } else {
                    for (var i = 0 ; i < nonSymbols.length ; i += 1) {
                        var expression = nonSymbols[i].expression;
                        // FIXME: equivalent_to is very expensive as it serializes both the LHS and RHS
                        if (node.constructor === expression.constructor && node.equivalent_to(expression)) {
                            replacementAst = nonSymbols[i].replacementAst;
                            break;
                        }
                    }
                }

                if (replacementAst) {
                    var stack = this.stack.reverse();
                    var replacement = node;
                    var originalNode = node;
                    var dontReplace = false;
                    var unmatchedPart = '';
                    var replacedUntil = -1;

                    stack.some(function (node, stackIndex) {
                        replacedUntil = stackIndex;
                        if (originalNode === node) {
                            replacement = replacementAst.clone();
                            return false;
                        } else if (node instanceof uglifyJs.AST_PropAccess && replacement !== node) {
                            var propVal = (node instanceof uglifyJs.AST_Dot) ? node.property : node.property.value;
                            var astIndex = astObjectIndexOfProperty(replacement, propVal);
                            if (astIndex !== -1) {
                                replacement = replacement.properties[astIndex].value;
                            } else {
                                dontReplace = true;
                                unmatchedPart = node;
                            }
                            return false; // continue up the stack
                        }
                        return true; // stop traversing the stack
                    });

                    if (dontReplace) {
                        assetGraph.emit('info', new Error(
                            'Could not find a value for "' + unmatchedPart.print_to_string() + '". Replacing with undefined.'
                        ));
                        uglifyAst.replaceDescendantNode(stack[replacedUntil], stack[replacedUntil - 1], new uglifyJs.AST_SymbolRef({name: 'undefined'}));
                        replacementPerformed = true;
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

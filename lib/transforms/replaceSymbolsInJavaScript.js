// Poor man's uglifyjs --define ... intended for use with --nocompress

var _ = require('lodash');
var parseExpression = require('../parseExpression');
var replaceDescendantNode = require('../replaceDescendantNode');
var esanimate = require('esanimate');
var estraverse = require('estraverse');
var escodegen = require('escodegen');

function astNodesAreIdentical(a, b) {
    // The horror!
    return escodegen.generate(a) === escodegen.generate(b);
}

function isLeftHandSideOfAssignment(stack, topNode) {
    for (var i = stack.length - 1 ; i >= 0 ; i -= 1) {
        if (stack[i].type === 'AssignmentExpression') {
            if (stack[i + 1] === stack[i].left) {
                return true;
            } else {
                break;
            }
        } else if (stack[i].type === 'VariableDeclarator') {
            if ((stack[i + 1] || topNode) === stack[i].id) {
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
            if ((prop.key.type === 'Identifier' || prop.key.type === 'Literal') && (prop.key.name || prop.key.value) === key) {
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
        var expression = parseExpression(symbolName),
            replacementAst = replacementAstBySymbolName[symbolName];
        // FIXME: Figure out how to avoid this polymorphism. Where is it being used?
        if (!(replacementAst && typeof replacementAst.type === 'string')) {
            if (replacementAst && typeof replacementAst === 'object') {
                replacementAst = esanimate.astify(replacementAst);
            } else {
                replacementAst = parseExpression(String(replacementAst));
            }
        }
        if (expression.type === 'Identifier') {
            replacementAstBySymbolName[expression.name] = replacementAst;
        } else {
            nonSymbols.push({expression: expression, replacementAst: replacementAst});
        }
    });

    return function replaceSymbolsInJavaScript(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var replacementPerformed = false;
            estraverse.traverse(javaScript.parseTree, {
                enter: function (node) {
                    var replacementAst;
                    if ((node.type === 'Literal' || node.type === 'Identifier') && Object.prototype.hasOwnProperty.call(replacementAstBySymbolName, node.name || node.value) && !isLeftHandSideOfAssignment(this.parents(), node)) {
                        replacementAst = replacementAstBySymbolName[node.name || node.value];
                    } else {
                        for (var i = 0 ; i < nonSymbols.length ; i += 1) {
                            var expression = nonSymbols[i].expression;
                            if (node.constructor === expression.constructor && astNodesAreIdentical(node, expression)) {
                                replacementAst = nonSymbols[i].replacementAst;
                                break;
                            }
                        }
                    }
                    if (replacementAst) {
                        var stack = this.parents().reverse();
                        if (stack[0].type === 'MemberExpression' && stack[0].property === node) {
                            // Don't consider cases where the identifier is the "property" part of
                            // a MemberExpression (eg. don't replace FOO when used as: window.FOO)
                            return;
                        }
                        stack.unshift(node);
                        var replacement = node;
                        var originalNode = node;
                        var dontReplace = false;
                        var unmatchedPart = '';
                        var replacedUntil = -1;

                        stack.some(function (node, stackIndex) {
                            replacedUntil = stackIndex;
                            if (originalNode === node) {
                                replacement = _.cloneDeep(replacementAst);
                                return false;
                            } else if (node.type === 'MemberExpression' && replacement !== node) {
                                if (node.computed && node.property.type !== 'Literal' && node.property.type !== 'Identifier')   {
                                    return true;
                                } else {
                                    var propVal = node.computed ? String(node.property.value) : node.property.name || node.property.value;
                                    var astIndex = astObjectIndexOfProperty(replacement, propVal);
                                    if (astIndex !== -1) {
                                        replacement = replacement.properties[astIndex].value;
                                    } else {
                                        dontReplace = true;
                                        unmatchedPart = node;
                                    }
                                    return false; // continue up the stack
                                }
                            }
                            return true; // stop traversing the stack
                        });

                        if (dontReplace) {
                            assetGraph.emit('warn', new Error(
                                'Could not find a value for "' + escodegen.generate(unmatchedPart) + '". Replacing with undefined.'
                            ));
                            replaceDescendantNode(stack[replacedUntil], stack[replacedUntil - 1], { type: 'Identifier', name: 'undefined' });
                            replacementPerformed = true;
                        }

                        if (!dontReplace && replacement !== node) {
                            replaceDescendantNode(stack[replacedUntil], stack[replacedUntil - 1], replacement);
                            replacementPerformed = true;
                        }
                    }
                }
            });
            if (replacementPerformed) {
                javaScript.markDirty();
            }
        });
    };
};

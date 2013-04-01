var _ = require('underscore'),
    AssetGraph = require('../AssetGraph'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst,
    symbolNames = {
        ' ': 'SPACE',
        '!': 'BANG',
        '.': 'DOT',
        '=': 'EQUALS',
        '~': 'TILDE',
        '$': 'DOLLAR',
        '#': 'HASH',
        '%': 'PERCENT',
        '/': 'SLASH',
        '<': 'LESSTHAN',
        '>': 'GREATERTHAN',
        '&': 'AMPERSAND',
        '?': 'QUESTIONMARK',
        "'": 'SINGLEQUOTE',
        '"': 'DOUBLEQUOTE',
        '+': 'PLUS',
        ',': 'COMMA',
        ';': 'SEMICOLON',
        ':': 'COLON',
        '(': 'LPAREN',
        ')': 'RPAREN',
        '{': 'LBRACE',
        '}': 'RBRACE',
        '[': 'LSQBRACE',
        ']': 'RSQBRACE'
    };

module.exports = function (queryObj, options) {
    options = options || {};
    options.globalNames = options.globalNames || [];
    Array.prototype.push.apply(options.globalNames, ['eval', 'clearInterval', 'clearTimeout', 'document', 'event', 'frames', 'history', 'Image', 'localStorage', 'location', 'name', 'navigator', 'Option', 'parent', 'screen', 'sessionStorage', 'setInterval', 'setTimeout', 'Storage', 'window', 'XMLHttpRequest', 'Math', 'Math.min', 'Math.max', 'Math.round', 'Function', 'Date', 'Date.prototype', 'Math.E', 'Math.LN2', 'Math.LN10', 'Math.LOG2E', 'Math.LOG10E', 'Math.PI', 'Math.SQRT1_2', 'Math.SQRT2', 'Math.abs', 'Math.acos', 'Math.asin', 'Math.atan', 'Math.atan2', 'Math.ceil', 'Math.cos', 'Math.exp', 'Math.floor', 'Math.log', 'Math.max', 'Math.min', 'Math.pow', 'Math.random', 'Math.round', 'Math.sin', 'Math.sqrt', 'Math.tan', 'parseInt', 'parseFloat', 'isNaN', 'NaN', 'RegExp', 'RegExp.prototype', 'RegExp.prototype.compile', 'RegExp.prototype.test', 'RegExp.prototype.exec', 'String', 'String.fromCharCode', 'String.prototype', 'String.prototype.charAt', 'String.prototype.charCodeAt', 'String.prototype.indexOf', 'String.prototype.match', 'String.prototype.replace', 'String.prototype.slice', 'String.prototype.split', 'String.prototype.substr', 'String.prototype.substring', 'String.prototype.toLowerCase', 'String.prototype.toUpperCase', 'Array', 'Array.prototype', 'Array.prototype.concat', 'Array.prototype.indexOf', 'Array.prototype.join', 'Array.prototype.pop', 'Array.prototype.push', 'Array.prototype.reverse', 'Array.prototype.shift', 'Array.prototype.slice', 'Array.prototype.sort', 'Array.prototype.splice', 'Array.prototype.unshift', 'Number', 'Number.prototype', 'Number.prototype.toFixed', 'Number.MAX_VALUE', 'Number.MIN_VALUE', 'Number.NEGATIVE_INFINITY', 'Number.NaN', 'Number.POSITIVE_INFINITY', 'Number.prototype', 'Boolean', 'Boolean.prototype', 'Error', 'Error.prototype', 'EvalError', 'EvalError.prototype', 'Infinity', 'JSON', 'JSON.stringify', 'JSON.parse', 'Object', 'Object.prototype', 'Object.prototype.toString', 'RangeError', 'RangeError.prototype', 'ReferenceError', 'ReferenceError.prototype', 'SyntaxError', 'SyntaxError.prototype', 'TypeError', 'TypeError.prototype', 'URIError', 'URIError.prototype', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'isFinite', 'undefined']);

    var globalsObj = {};
    options.globalNames.forEach(function (global) {
        globalsObj[global] = true;
    });
    return function pullGlobalsIntoVariables(assetGraph) {
console.warn("Whoa!");
try{
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScriptAsset) {
            var occurrencesByGlobalName = {},
                occurrencesByString = {},
                ast = javaScriptAsset.parseTree,
                seenNames = {}, // To avoid collisions when introducing new vars
                seenLocals = {}, // To avoid aliasing globals that are shadowed by a local var somewhere
                walker = new uglifyJs.TreeWalker(function (node) {
                    if (node instanceof uglifyJs.AST_Dot) {
                        var name = node.print_to_string();
                        if (name in globalsObj) {
                            if (!occurrencesByGlobalName.hasOwnProperty(name)) {
                                occurrencesByGlobalName[name] = [];
                            }
                            occurrencesByGlobalName[name].push({node: node, parentNode: walker.parent()});
                        } else if (node.property.length > 2) {
                            // .foo() => [a]() won't save anything if the method name is 2 chars or less

                            if (!Object.prototype.hasOwnProperty.call(occurrencesByString, node.property)) {
                                occurrencesByString[node.property] = [];
                            }
                            occurrencesByString[node.property].push({node: node, parentNode: walker.parent()});
                        }
                    } else if (node instanceof uglifyJs.AST_Defun) {
                        seenLocals[node.name.name] = true;
                    } else if (node instanceof uglifyJs.AST_Function) {
                        if (node.name) {
                            seenLocals[node.name.name] = true;
                        }
                    } else if (node instanceof uglifyJs.AST_Definitions) {
                        node.definitions.forEach(function (definition) {
                            seenNames[definition.name] = true;
                            seenLocals[definition.name] = true;
                        });
                    } else if (node instanceof uglifyJs.AST_String) {
                        if (!Object.prototype.hasOwnProperty.call(occurrencesByString, node.value)) {
                            occurrencesByString[node.value] = [];
                        }
                        occurrencesByString[node.value].push({node: node, parentNode: walker.parent()});
                    } else if (node instanceof uglifyJs.AST_SymbolRef) {
                        seenNames[node.name] = true;
                        if (node.name in globalsObj) {
                            if (!occurrencesByGlobalName.hasOwnProperty(node.name)) {
                                occurrencesByGlobalName[node.name] = [];
                            }
                            occurrencesByGlobalName[node.name].push({node: node, parentNode: walker.parent()});
                        }
                    }
                });

            ast.walk(walker);

            // Order by number of dots ascending so e.g. Math is considered before Math.min:
            var globalNames = Object.keys(occurrencesByGlobalName).sort(function (a, b) {
                return a.split('.').length - b.split('.').length;
            });
            var aliasDeclarations = [],
                aliasByGlobalName = {};

            function nameToAst(name) {
                name = (!options.wrapInFunction && aliasByGlobalName.hasOwnProperty(name) && aliasByGlobalName[name]) || name;
                var nameFragments = name.split('.');
                if (nameFragments.length > 1) {
                    return new uglifyJs.AST_Dot({
                        expression: nameToAst(nameFragments.slice(0, nameFragments.length - 1).join('.')),
                        property: nameFragments[nameFragments.length - 1]
                    });
                } else {
                    return new uglifyJs.AST_SymbolRef({name: nameFragments[0]});
                }
            }

            globalNames.forEach(function (globalName) {
                if (!seenLocals.hasOwnProperty(globalName) && occurrencesByGlobalName[globalName].length > 1) {
                    var alias = globalName.replace(/\./g, '').toUpperCase();
                    while (seenNames.hasOwnProperty(alias)) {
                        alias += '_';
                    }
                    seenNames[alias] = true;
                    aliasDeclarations.push({name: alias, valueAst: nameToAst(globalName)});
                    occurrencesByGlobalName[globalName].forEach(function (occurrence) {
                        uglifyAst.replaceDescendantNode(occurrence.parentNode, occurrence.node, new uglifyJs.AST_SymbolRef({name: alias}));
                    });
                    aliasByGlobalName[globalName] = alias;
                } else {
                    delete occurrencesByGlobalName[globalName];
                }
            });

            if (options.stringLiterals) {
                Object.keys(occurrencesByString).forEach(function (string) {
                    var occurrences = occurrencesByString[string],
                        savedBytes = -string.length - 5;
                    occurrences.forEach(function (occurrence) {
                        if (occurrence.node instanceof uglifyJs.AST_String) {
                            savedBytes += string.length + 4;
                        } else {
                            // parent is AST_Dot
                            savedBytes += string.length - 3;
                        }
                    });

                    if (occurrences.length >= 2) {
                        var alias = string || 'EMPTY';
                        Object.keys(symbolNames).forEach(function (symbol) {
                            while (alias.indexOf(symbol) !== -1) {
                                alias = alias.replace(symbol, symbolNames[symbol]);
                            }
                        });

                        if (/^[0-9]/.test(alias)) {
                            alias = '_' + alias;
                        }
                        alias = alias.replace(/[^a-z0-9_]/gi, '').toUpperCase();
                        while (!alias || Object.prototype.hasOwnProperty.call(seenNames, alias)) {
                            alias += '_';
                        }
                        seenNames[alias] = true;
                        aliasDeclarations.push({name: alias, valueAst: new uglifyJs.AST_String({value: string})});
                        occurrences.forEach(function (occurrence) {
                            if (occurrence.node instanceof uglifyJs.AST_String) {
                                uglifyAst.replaceDescendantNode(occurrence.parentNode, occurrence.node, new uglifyJs.AST_SymbolRef({name: alias}));
                            } else {
                                // parent is AST_Dot
                                uglifyAst.replaceDescendantNode(occurrence.parentNode,
                                                                occurrence.node,
                                                                new uglifyJs.AST_Sub({
                                                                    property: new uglifyJs.AST_SymbolRef({name: alias}),
                                                                    expression: occurrence.node.expression
                                                                })
                                );
                            }
                        });
                    }
                });
            }

            if (aliasDeclarations.length) {
                if (options.wrapInFunction) {
                    ast.body = new uglifyJs.AST_SimpleStatement({
                        body: new uglifyJs.AST_Call({
                            expression: new uglifyJs.AST_Function({
                                argnames: aliasDeclarations.map(function (aliasDeclaration) {
                                    return new uglifyJs.AST_SymbolFunarg({name: aliasDeclaration.name});
                                }),
                                body: ast.body
                            }),
                            args: _.pluck(aliasDeclarations, 'valueAst')
                        })
                    });
                } else {
                    ast.body.unshift(new uglifyJs.AST_Var({
                        definitions: aliasDeclarations.map(function (aliasDeclaration) {
                            return new uglifyJs.AST_VarDef({
                                name: new uglifyJs.AST_SymbolVar({name: aliasDeclaration.name}),
                                value: aliasDeclaration.valueAst
                            });
                        })
                    }));
                }
                javaScriptAsset.markDirty();
            }
        });
}catch(e){console.warn("OUCH " + e.stack);}
    };
};

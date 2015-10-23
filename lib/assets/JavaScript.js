/*jshint shadow:true*/
var util = require('util'),
    _ = require('lodash'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    estraverse = require('estraverse'),
    esmangle = require('esmangle'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    repeatString = require('repeat-string'),
    errors = require('../errors'),
    Text = require('./Text'),
    resolveCommonJsModuleName = require('../resolveCommonJsModuleName'),
    urlTools = require('urltools'),
    AssetGraph = require('../');

function JavaScript(config) {
    Text.call(this, config);
    this.serializationOptions = this.serializationOptions || {};
}

util.inherits(JavaScript, Text);

function isNamedDefineNode(node) {
    return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'define' &&
        node.arguments.length === 2 &&
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string'
    );
}

function shouldCommentNodeBePreservedInNonPrettyPrintedOutput(comment) {
    return (/@jsx|@preserve|@license|@cc_on|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment.value);
}

extendWithGettersAndSetters(JavaScript.prototype, {
    contentType: 'application/javascript',

    supportedExtensions: ['.js'],

    isPretty: false,

    // Boolean indicating if the asset is part of a RequireJS load graph
    isRequired: false,

    // Boolean indicating if the asset has a global "use strict"; statement
    // Useful for wrapping the asset in an IIFE when concatenating in order to avoid leakage
    strict: false,

    get text() {
        if (!('_text' in this)) {
            var parseTree = this._parseTree;
            if (parseTree) {
                var outputOptions = _.defaults({}, this.serializationOptions, this.assetGraph && this.assetGraph.javaScriptSerializationOptions);
                var text = escodegen.generate(parseTree, {
                    format: {
                        compact: !this.isPretty,
                        semicolons: this.isPretty,
                        escapeless: !outputOptions.ascii_only,
                        indent: {
                            style: typeof outputOptions.indent_level === 'number' ? repeatString(' ', outputOptions.indent_level) : '    '
                        }
                    },
                    comment: true
                });
                if (text.length > 0) {
                    var lastStatement = parseTree.body.length && parseTree.body[parseTree.body.length - 1];
                    if (lastStatement.trailingComments && lastStatement.trailingComments.length > 0) {
                        text = text.replace(/\n?$/, '\n'); // End with a newline if the asset ends with a comment
                    } else {
                        text = text.replace(/;*$/, ';'); // Always end with a semicolon like the UglifyJS binary (if non-empty)
                    }
                }
                this._text = text;
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    get parseTree() {
        if (!this._parseTree) {
            var text = this.text;
            try {
                var nonInlineAncestor = this.nonInlineAncestor;
                this._parseTree = esprima.parse(text, { loc: true, attachComment: true, source: (nonInlineAncestor && nonInlineAncestor.url) || this.url || this.id + '.js' });
            } catch (e) {
                var err = new errors.ParseError({
                    message: 'Parse error in ' + this.urlOrDescription + '\n' + e.message + ' (line ' + e.lineNumber + ')',
                    line: e.lineNumber,
                    index: e.index,
                    asset: this
                });
                if (this.assetGraph) {
                    this.assetGraph.emit('warn', err);
                } else {
                    throw err;
                }
                this._parseTree = esprima.parse('', { loc: true, source: this.urlOrDescription });
            }
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this.markDirty();
    },

    get isEmpty() {
        return this.parseTree.body.length === 0;
    },

    minify: function () {
        this.isPretty = false;
        var parseTree = this.parseTree; // Important side effect: The markDirty call below will remove this._text

        function filterCommentAttribute(node, attributeName) {
            if (node[attributeName]) {
                var leftoverComments = node[attributeName].filter(shouldCommentNodeBePreservedInNonPrettyPrintedOutput);
                if (leftoverComments.length > 0) {
                    node[attributeName] = leftoverComments;
                } else {
                    node[attributeName] = undefined;
                }
            }
        }

        estraverse.traverse(parseTree, {
            enter: function (node) {
                filterCommentAttribute(node, 'leadingComments');
                filterCommentAttribute(node, 'trailingComments');
            }
        });

        this.markDirty();
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this),
            syntaxErrors = [],
            warnings = [],
            infos = [],
            assetGraph = this.assetGraph;

        // Register any shim dependencies as outgoing relations
        if (assetGraph && assetGraph.requireJsConfig) {
            var moduleName,
                shimConfig;

            this.incomingRelations.some(function (rel) {
                if ((/^JavaScript(?:ShimRequire|Amd(?:Define|Require))$/).test(rel.type) && rel.rawHref) {
                    moduleName = rel.rawHref;
                    shimConfig = assetGraph.requireJsConfig.shim[moduleName];
                    return true;
                }
            });

            if (shimConfig && shimConfig.deps) {
                assetGraph.requireJsConfig.shim[moduleName].deps.forEach(function (shimModuleName) {
                    var outgoingRelation = new AssetGraph.JavaScriptShimRequire({
                        requireJsConfig: this.assetGraph && this.assetGraph.requireJsConfig, // Hmmm
                        from: this,
                        href: shimModuleName
                    });
                    outgoingRelation.to = {url: outgoingRelation.targetUrl};
                    outgoingRelations.push(outgoingRelation);
                }, this);
            }
        }

        var nestedDefineNodes = [];

        var tryFoldConstantToString = function (node) {
            if (node.type === 'Literal') {
                return node;
            } else {
                var wrappedNode = {
                    type: 'Program',
                    body: [
                        {
                            type: 'VariableDeclaration',
                            kind: 'var',
                            declarations: [
                                {
                                    type: 'VariableDeclarator',
                                    id: { type: 'Identifier', name: 'foo' },
                                    init: node
                                }
                            ]
                        }
                    ]
                };
                var foldedNode = esmangle.optimize(wrappedNode);
                var valueNode = foldedNode.body[0].declarations[0].init;
                if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
                    this.markDirty();
                    return valueNode;
                } else {
                    return node;
                }
            }
        }.bind(this);

        var that = this;
        var parseTree = this.parseTree;

        (parseTree.comments || []).forEach(function (comment) {
            var matchSourceUrlOrSourceMappingUrl = comment.value.match(/[@#]\s*source(Mapping)?URL=([^\s\n]*)/);
            if (matchSourceUrlOrSourceMappingUrl) {
                if (matchSourceUrlOrSourceMappingUrl[1] === 'Mapping') {
                    outgoingRelations.push(new AssetGraph.JavaScriptSourceMappingUrl({
                        from: that,
                        node: comment,
                        to: {
                            url: matchSourceUrlOrSourceMappingUrl[2],
                            // Source maps are currently served as application/json, so prevent the target asset
                            // from being loaded as a Json asset:
                            type: 'SourceMap'
                        }
                    }));
                } else {
                    outgoingRelations.push(new AssetGraph.JavaScriptSourceUrl({
                        from: that,
                        node: comment,
                        to: {
                            url: matchSourceUrlOrSourceMappingUrl[2]
                        }
                    }));
                }
            }
        });

        estraverse.traverse(parseTree, {
            enter: function (node, parentNode) {
                var stack = this.parents();
                stack.push(node);

                // Detect global 'use strict' directives
                if (parentNode === that.parseTree &&
                    node.type === 'ExpressionStatement' &&
                    node.expression.type === 'Literal' &&
                    node.expression.value === 'use strict') {

                    that.strict = true;
                }

                if (node.type === 'CallExpression') {
                    var parentParentNode = stack[stack.length - 3];
                    if (node.callee.type === 'MemberExpression' &&
                        !node.callee.computed &&
                        node.callee.property.name === 'module' &&
                        node.callee.object.type === 'Identifier' &&
                        node.callee.object.name === 'angular') {

                        var diveIntoAngularMethodCall = function (argumentNodes, templateCacheVariableName) {
                            argumentNodes.forEach(function (argumentNode) {
                                estraverse.traverse(argumentNode, {
                                    enter: function (node, parentNode) {
                                        if (node.type === 'ObjectExpression') {
                                            node.properties.forEach(function (property) {
                                                if (property.kind === 'init' && (property.key.type === 'Identifier' || property.key.type === 'Literal')) {
                                                    if ((property.key.name || property.key.value) === 'templateUrl' && property.value.type === 'Literal' && typeof property.value.value === 'string') {
                                                        outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplate({
                                                            from: that,
                                                            to: {
                                                                type: 'Html',
                                                                url: property.value.value
                                                            },
                                                            node: property,
                                                            parentNode: node
                                                        }));
                                                    } else if ((property.key.name || property.key.value) === 'template' && property.value.type === 'Literal' && typeof property.value.value === 'string') {
                                                        outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplate({
                                                            from: that,
                                                            to: new AssetGraph.Html({
                                                                text: property.value.value
                                                            }),
                                                            node: property,
                                                            parentNode: node
                                                        }));
                                                    }
                                                }
                                            });
                                        } else if (node.type === 'ExpressionStatement') {
                                            if (parentNode.type === 'FunctionExpression' || parentNode.type === 'FunctionDeclaration') {
                                                // Use the statements array of the function instead:
                                                parentNode = parentNode.body;
                                            }
                                            if (node.expression.type === 'CallExpression' &&
                                                node.expression.callee.type === 'MemberExpression' && !node.expression.callee.computed &&
                                                node.expression.callee.property.name === 'put' &&
                                                node.expression.callee.object.type === 'Identifier' &&
                                                node.expression.callee.object.name === templateCacheVariableName &&
                                                node.expression.arguments.length === 2 &&
                                                node.expression.arguments[0].type === 'Literal' && typeof node.expression.arguments[0].value === 'string' &&
                                                node.expression.arguments[1].type === 'Literal' && typeof node.expression.arguments[0].value === 'string') {

                                                outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplateCacheAssignment({
                                                    from: that,
                                                    to: new AssetGraph.Html({
                                                        isExternalizable: false,
                                                        text: node.expression.arguments[1].value
                                                    }),
                                                    node: node,
                                                    parentNode: parentNode
                                                }));
                                            }
                                        }
                                    }
                                });
                            });
                        };

                        var stackPosition = stack.length - 1;
                        while (stack[stackPosition - 1].type === 'MemberExpression' && !stack[stackPosition - 1].computed && stack[stackPosition - 2].type === 'CallExpression') {
                            var callNode = stack[stackPosition - 2],
                                methodName = stack[stackPosition - 1].property.name,
                                argumentNodes = callNode.arguments,
                                templateCacheVariableName;

                            if (methodName === 'run' &&
                                argumentNodes.length > 0 &&
                                argumentNodes[0].type === 'ArrayExpression' &&
                                argumentNodes[0].elements.length === 2 &&
                                argumentNodes[0].elements[0].type === 'Literal' &&
                                argumentNodes[0].elements[0].value === '$templateCache' &&
                                argumentNodes[0].elements[1].type === 'FunctionExpression' &&
                                argumentNodes[0].elements[1].params[0].type === 'Identifier') {

                                templateCacheVariableName = argumentNodes[0].elements[1].params[0].name;
                            }
                            diveIntoAngularMethodCall(argumentNodes, templateCacheVariableName);
                            stackPosition -= 2;
                        }
                    }
                    if (node.callee.type === 'Identifier' && node.callee.name === 'INCLUDE') {
                        if (node.arguments.length === 1 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
                            outgoingRelations.push(new AssetGraph.JavaScriptInclude({
                                from: that,
                                to: {
                                    url: node.arguments[0].value
                                },
                                node: node,
                                detachableNode: parentNode.type === 'SequenceExpression' ? node : parentNode,
                                parentNode: parentNode.type === 'SequenceExpression' ? parentNode : parentParentNode
                            }));
                        } else {
                            syntaxErrors.push(new errors.SyntaxError({
                                message: 'Invalid INCLUDE syntax: Must take a single string argument:' + escodegen.generate(node),
                                asset: that
                            }));
                        }
                    } else if (node.callee.type === 'Identifier' && node.callee.name === 'GETTEXT') {
                        if (node.arguments.length === 1) {
                            // TRHTML(GETTEXT(...)) is covered by TRHTML below:
                            if (parentNode.type !== 'CallExpression' || parentNode.callee.type !== 'Identifier' || parentNode.callee.name !== 'TRHTML') {
                                node.arguments[0] = tryFoldConstantToString(node.arguments[0]);
                                if (node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
                                    outgoingRelations.push(new AssetGraph.JavaScriptGetText({
                                        parentNode: parentNode,
                                        from: that,
                                        to: {
                                            url: node.arguments[0].value
                                        },
                                        node: node
                                    }));
                                } else {
                                    syntaxErrors.push(new errors.SyntaxError({
                                        message: 'Invalid GETTEXT syntax: ' + escodegen.generate(node),
                                        asset: that
                                    }));
                                }
                            }
                        } else {
                            syntaxErrors.push(new errors.SyntaxError({
                                message: 'Invalid GETTEXT syntax: ' + escodegen.generate(node),
                                asset: that
                            }));
                        }
                    } else if (node.callee.type === 'Identifier' && node.callee.name === 'GETSTATICURL') {
                        outgoingRelations.push(new AssetGraph.JavaScriptGetStaticUrl({
                            from: that,
                            parentNode: parentNode,
                            node: node,
                            to: new AssetGraph.StaticUrlMap({
                                parseTree: [].concat(node.arguments) // FIXME: Do a deep clone here as was done with Uglify
                            })
                        }));
                    } else if (node.callee.type === 'Identifier' && node.callee.name === 'TRHTML') {
                        var outgoingRelation;
                        if (node.arguments[0].type === 'CallExpression' && node.arguments[0].callee.type === 'Identifier' && node.arguments[0].callee.name === 'GETTEXT' && node.arguments[0].arguments.length === 1) {
                            node.arguments[0].arguments[0] = tryFoldConstantToString(node.arguments[0].arguments[0]);
                            if (node.arguments[0].arguments[0].type === 'Literal' && typeof node.arguments[0].arguments[0].value === 'string') {
                                outgoingRelation = new AssetGraph.JavaScriptTrHtml({
                                    from: that,
                                    parentNode: parentNode,
                                    node: node,
                                    to: {
                                        url: node.arguments[0].arguments[0].value
                                    }
                                });
                            }
                        } else {
                            node.arguments[0] = tryFoldConstantToString(node.arguments[0]);
                            if (node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
                                outgoingRelation = new AssetGraph.JavaScriptTrHtml({
                                    from: that,
                                    parentNode: parentNode,
                                    node: node,
                                    to: new AssetGraph.Html({
                                        node: node,
                                        text: node.arguments[0].value
                                    })
                                });
                            }
                        }
                        if (outgoingRelation) {
                            outgoingRelations.push(outgoingRelation);
                        } else {
                            syntaxErrors.push(new errors.SyntaxError({
                                message: 'Invalid TRHTML syntax: ' + escodegen.generate(node),
                                asset: that
                            }));
                        }
                    } else if (node.callee.type === 'Identifier' &&
                               (node.callee.name === 'require' || node.callee.name === 'requirejs') &&
                               ((node.arguments.length === 2 && (node.arguments[1].type === 'FunctionExpression' || node.arguments[1].type === 'Identifier')) || node.arguments.length === 1) &&
                               node.arguments[0].type === 'ArrayExpression') {
                        // There's no 3 argument version of require, so check whether the require is succeeded by define('moduleName', ...);
                        // like flattenRequireJs and r.js would output. If it is, don't model it as a relation.
                        var parentIndex = stack.length - 1,
                            isSucceededByDefineWithStringArg = false,
                            seenDefine = false;
                        OUTER:
                        while (parentIndex >= 0) {
                            if (stack[parentIndex].type === 'BlockStatement' || stack[parentIndex].type === 'Program') {
                                var blockNode = stack[parentIndex];
                                for (var i = blockNode.body.indexOf(stack[parentIndex + 1]) ; i < blockNode.body.length ; i += 1) {
                                    if (blockNode.body[i].type === 'ExpressionStatement' && isNamedDefineNode(blockNode.body[i].expression)) {
                                        isSucceededByDefineWithStringArg = true;
                                        break OUTER;
                                    }
                                }
                                break OUTER;
                            } else if (stack[parentIndex].type === 'SequenceExpression') {
                                estraverse.traverse(stack[parentIndex], {
                                    enter: function (_node) {
                                        if (_node === node) {
                                            seenDefine = true;
                                        } else if (seenDefine && isNamedDefineNode(_node)) {
                                            isSucceededByDefineWithStringArg = true;
                                        }
                                    }
                                });
                                break OUTER;
                            } else {
                                parentIndex -= 1;
                            }
                        }

                        if (!isSucceededByDefineWithStringArg) {
                            var arrayNode = node.arguments[0];
                            arrayNode.elements.forEach(function (arrayItemAst, i) {
                                arrayItemAst = arrayNode.elements[i] = tryFoldConstantToString(arrayItemAst);
                                if (arrayItemAst.type === 'Literal' && typeof arrayItemAst.value === 'string') {
                                    if (['require', 'exports', 'module'].indexOf(arrayItemAst.value) === -1) {
                                        var outgoingRelation = new AssetGraph.JavaScriptAmdRequire({
                                            requireJsConfig: that.assetGraph && that.assetGraph.requireJsConfig, // Hmmm
                                            from: that,
                                            callNode: node,
                                            arrayNode: arrayNode,
                                            node: arrayItemAst
                                        });
                                        outgoingRelation.to = {
                                            url: outgoingRelation.targetUrl,
                                            isRequired: true
                                        };
                                        outgoingRelations.push(outgoingRelation);
                                    }
                                }
                            });
                        }
                    } else if (that.isRequired && node.callee.type === 'Identifier' && node.callee.name === 'define') {
                        if (node.arguments.length === 2 && node.arguments[0].type === 'ArrayExpression') {
                            var arrayNode = node.arguments[0];
                            arrayNode.elements.forEach(function (arrayItemAst, i) {
                                arrayNode.elements[i] = arrayItemAst = tryFoldConstantToString(arrayItemAst);
                                if (arrayItemAst.type === 'Literal' && typeof arrayItemAst.value === 'string') {
                                    if (['require', 'exports', 'module'].indexOf(arrayItemAst.value) === -1) {
                                        var outgoingRelation = new AssetGraph.JavaScriptAmdDefine({
                                            requireJsConfig: that.assetGraph && that.assetGraph.requireJsConfig, // Hmmm
                                            from: that,
                                            callNode: node,
                                            arrayNode: arrayNode,
                                            node: arrayItemAst
                                        });
                                        outgoingRelation.to = {
                                            url: outgoingRelation.targetUrl,
                                            isRequired: true
                                        };
                                        outgoingRelations.push(outgoingRelation);
                                    }
                                }
                            });
                        }

                        // Keep track of the fact that we're in the body of a define(function () {...}) that might contain
                        // JavaScriptRequireJsCommonJsCompatibilityRequire relations
                        var lastArgument = node.arguments.length > 0 && node.arguments[node.arguments.length - 1];
                        if (lastArgument && lastArgument.type === 'FunctionExpression') {
                            nestedDefineNodes.push(node);
                        }
                    } else if (node.callee.type === 'Identifier' && node.callee.name === 'require' &&
                               node.arguments.length === 1 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].type === 'string') {
                        if (nestedDefineNodes.length > 0) {
                            var parentDefineNode = nestedDefineNodes[nestedDefineNodes.length - 1];
                            if (parentDefineNode.arguments[0].type !== 'Literal' || typeof parentDefineNode.arguments[0].value !== 'string') {
                                var outgoingRelation = new AssetGraph.JavaScriptRequireJsCommonJsCompatibilityRequire({
                                    parentDefineNode: parentDefineNode,
                                    requireJsConfig: that.assetGraph && that.assetGraph.requireJsConfig, // Hmmm
                                    from: that,
                                    node: node
                                });
                                outgoingRelation.to = {
                                    url: outgoingRelation.targetUrl,
                                    isRequired: true
                                };
                                outgoingRelations.push(outgoingRelation);
                            }
                        } else if (!that.isRequired) {

                            // Walk up the tree to look for require function definitions via arguments:
                            // (function (require, module) { require('dependency'); })
                            // Assume self encapsulation if found, like browserify
                            var argRequireDefinition = stack.some(function (node, idx) {
                                return node.params && node.params.some(function (param) {
                                    return param.type === 'Identifier' && param.name === 'require';
                                });
                            });

                            // Self defined require function not found, assume CommonJs
                            if (!argRequireDefinition) {
                                var baseUrl = that.nonInlineAncestor && that.nonInlineAncestor.url;
                                if (/^file:/.test(baseUrl)) {
                                    var resolvedCommonJsModuleName = resolveCommonJsModuleName(urlTools.fileUrlToFsPath(baseUrl), node.arguments[0].value);

                                    // Skip built-in and unresolvable modules (they just resolve to 'fs', 'util', etc., not a file name):
                                    if (!resolvedCommonJsModuleName) {
                                        warnings.push(new errors.SyntaxError({message: 'Couldn\'t resolve ' + escodegen.generate(node) + ', skipping', relationType: 'JavaScriptCommonJsRequire'}));
                                    } else if (/^\//.test(resolvedCommonJsModuleName)) {
                                        outgoingRelations.push(new AssetGraph.JavaScriptCommonJsRequire({
                                            from: that,
                                            to: {
                                                url: urlTools.fsFilePathToFileUrl(resolvedCommonJsModuleName)
                                            },
                                            node: node
                                        }));
                                    }
                                } else {
                                    warnings.push(new errors.SyntaxError({message: 'Skipping JavaScriptCommonJsRequire (only supported from file: urls): ' + escodegen.generate(node), relationType: 'JavaScriptCommonJsRequire'}));
                                }
                            }
                        }
                    }
                }
            },
            leave: function (node) {
                if (nestedDefineNodes.length > 0 && nestedDefineNodes[nestedDefineNodes.length - 1] === node) {
                    nestedDefineNodes.pop();
                }
            }
        });
        if (syntaxErrors.length) {
            if (this.assetGraph) {
                syntaxErrors.forEach(function (syntaxError) {
                    syntaxError.asset = this;
                    this.assetGraph.emit('warn', syntaxError);
                }, this);
            } else {
                throw syntaxErrors[0];
            }
        }
        if (warnings.length) {
            warnings.forEach(function (warning) {
                if (this.assetGraph) {
                    warning.asset = this;
                    this.assetGraph.emit('warn', warning);
                } else {
                    console.warn(warning.message);
                }
            }, this);
        }
        if (infos.length) {
            infos.forEach(function (info) {
                if (this.assetGraph) {
                    info.asset = this;
                    this.assetGraph.emit('info', info);
                } else {
                    console.info(info.message);
                }
            }, this);
        }
        return outgoingRelations;
    }
});

// Grrr...
JavaScript.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

module.exports = JavaScript;

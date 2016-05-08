/* eslint no-redeclare: "off", block-scoped-var: "off" */
var util = require('util'),
    _ = require('lodash'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    estraverse = require('estraverse'),
    esmangle = require('esmangle'),
    espurify = require('espurify'),
    sourceMapToAst = require('sourcemap-to-ast'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    repeatString = require('repeat-string'),
    errors = require('../errors'),
    Text = require('./Text'),
    AssetGraph = require('../');

function JavaScript(config) {
    Text.call(this, config);
    this.serializationOptions = this.serializationOptions || {};
}

util.inherits(JavaScript, Text);

function shouldCommentNodeBePreservedInNonPrettyPrintedOutput(comment) {
    return (/@jsx|@preserve|@license|@cc_on|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment.value);
}

extendWithGettersAndSetters(JavaScript.prototype, {
    contentType: 'application/javascript',

    supportedExtensions: ['.js'],

    // Boolean indicating if the asset is part of a RequireJS load graph
    isRequired: false,

    // Boolean indicating if the asset has a global "use strict"; statement
    // Useful for wrapping the asset in an IIFE when concatenating in order to avoid leakage
    strict: false,

    _getEscodegenOptions: function () {
        var outputOptions = _.defaults({}, this.serializationOptions, this.assetGraph && this.assetGraph.javaScriptSerializationOptions);
        return {
            format: {
                compact: outputOptions.compact, // Takes precedence over space, newline, and indent
                space: typeof outputOptions.space === 'undefined' ? (this.isPretty || !this.isMinified ? ' ' : '') : outputOptions.space,
                newline: typeof outputOptions.newline === 'undefined' ? (this.isPretty || !this.isMinified ? '\n' : '') : outputOptions.newline,
                semicolons: typeof outputOptions.semicolons === 'undefined' ? (this.isPretty || !this.isMinified ? '\n' : '') : outputOptions.semicolons,
                parentheses: typeof outputOptions.parentheses === 'undefined' ? (this.isPretty || !this.isMinified ? '\n' : '') : outputOptions.parentheses,
                escapeless: typeof outputOptions.escapeless === 'undefined' ? !outputOptions.ascii_only : outputOptions.escapeless,
                indent: {
                    style: typeof outputOptions.indent_level === 'number' ?
                        repeatString(' ', outputOptions.indent_level) :
                        (this.isPretty || !this.isMinified ? '    ' : '')
                }
            },
            comment: true
        };
    },

    get text() {
        if (typeof this._text !== 'string') {
            var parseTree = this._parseTree;
            if (parseTree) {
                this._text = this._patchUpSerializedText(escodegen.generate(parseTree, this._getEscodegenOptions()), parseTree);
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    get sourceMap() {
        if (typeof this._sourceMap === 'undefined') {
            this._sourceMap = escodegen.generate(this.parseTree, _.defaults({ sourceMap: true }, this._getEscodegenOptions()));
        }
        if (typeof this._sourceMap === 'string') {
            this._sourceMap = JSON.parse(this._sourceMap);
        }
        return this._sourceMap;
    },

    _applySourceMapToParseTree: function () {
        try {
            sourceMapToAst(this.parseTree, this._sourceMap);
        } catch (e) {
            // FIXME: Look into why sourceMapToAst fails on some of the assetgraph-builder tests:
            if (!/^Line must be greater than/.test(e.message)) {
                throw e;
            }
        }
    },

    set sourceMap(sourceMap) {
        this._sourceMap = sourceMap;
        if (typeof this._parseTree !== 'undefined') {
            this._applySourceMapToParseTree();
        }
    },

    _patchUpSerializedText: function (text, parseTree) {
        if (text.length > 0) {
            var lastStatement = parseTree.body.length && parseTree.body[parseTree.body.length - 1];
            if (lastStatement.trailingComments && lastStatement.trailingComments.length > 0) {
                return text.replace(/\n?$/, '\n'); // End with a newline if the asset ends with a comment
            } else {
                return text.replace(/;*$/, ';'); // Always end with a semicolon like the UglifyJS binary (if non-empty)
            }
        }
        return text;
    },

    get textAndSourceMap() {
        if (typeof this._text === 'string') {
            return {
                text: this._text,
                sourceMap: this.sourceMap
            };
        } else if (typeof this._parseTree !== 'undefined' && typeof this._sourceMap !== 'undefined') {
            return {
                text: this.text,
                sourceMap: this.sourceMap
            };
        } else {
            var parseTree = this._parseTree;
            var result = escodegen.generate(parseTree, _.defaults({ sourceMap: true, sourceMapWithCode: true }, this._getEscodegenOptions()));
            this._text = this._patchUpSerializedText(result.code, parseTree);
            this._sourceMap = result.map.toJSON();
            return {
                text: this._text,
                sourceMap: this.sourceMap
            };
        }
    },

    get parseTree() {
        if (!this._parseTree) {
            var text = this.text;
            var nonInlineAncestor = this.nonInlineAncestor;
            var sourceUrl = this.sourceUrl || (nonInlineAncestor && nonInlineAncestor.url) || this.url || 'standalone-' + this.id + '.js';
            try {
                this._parseTree = esprima.parse(text, {
                    // Don't incur the penalty of tracking source locations if source maps are disabled globally:
                    loc: !this.assetGraph || this.assetGraph.sourceMaps !== false,
                    attachComment: true,
                    source: sourceUrl
                });
                if (this._sourceMap) {
                    this._applySourceMapToParseTree();
                }
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
                this._parseTree = esprima.parse('', { loc: true, source: sourceUrl });
            }
        }
        return this._parseTree;
    },

    set parseTree(parseTree) {
        this.unload();
        this._parseTree = parseTree;
        this._sourceMap = undefined;
        this.markDirty();
    },

    get isEmpty() {
        return this.parseTree.body.length === 0;
    },

    _cloneParseTree: function () {
        return espurify.customize({ extra: [ 'loc', 'range', 'source_type', 'comments', 'raw', 'trailingComments', 'leadingComments' ] })(this._parseTree);
    },

    minify: function () {
        this.isPretty = false;
        this.isMinified = true;
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
        this.isMinified = false;
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = Text.prototype.findOutgoingRelationsInParseTree.call(this),
            syntaxErrors = [],
            warnings = [],
            infos = [];

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
                    }
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

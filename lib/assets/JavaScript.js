/*jshint shadow:true*/
var util = require('util'),
    _ = require('underscore'),
    uglifyJs = require('uglify-js-papandreou'),
    uglifyAst = require('uglifyast')(uglifyJs),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    errors = require('../errors'),
    Text = require('./Text'),
    resolveCommonJsModuleName = require('../resolveCommonJsModuleName'),
    urlTools = require('urltools'),
    AssetGraph = require('../');

function JavaScript(config) {
    Text.call(this, config);
}

util.inherits(JavaScript, Text);

function isNamedDefineNode(node) {
    return (
        node instanceof uglifyJs.AST_Call &&
        node.expression instanceof uglifyJs.AST_Symbol &&
        node.expression.name === 'define' &&
        node.args.length === 2 &&
        node.args[0] instanceof uglifyJs.AST_String
    );
}

function shouldCommentNodeBePreservedInNonPrettyPrintedOutput(node, comment) {
    return (/@preserve|@license|@cc_on|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment.value);
}

extendWithGettersAndSetters(JavaScript.prototype, {
    contentType: 'application/javascript', // TODO: Double check that this is everyone's recommended value

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
                var outputStream = uglifyJs.OutputStream({
                    // Preserve all comments when isPretty is true, and only preserve copyright notices/license info
                    // when it's false:
                    comments: this.isPretty || shouldCommentNodeBePreservedInNonPrettyPrintedOutput,
                    beautify: this.isPretty,
                    quote_char: this.quoteChar,
                    source_map: null
                });
                parseTree.print(outputStream);
                var text = outputStream.get();

                if (text.length > 0) {
                    text = text.replace(/;*$/, ';'); // Always end with a semicolon like the UglifyJS binary (if non-empty)
                }

                // Workaround for https://github.com/mishoo/UglifyJS2/issues/180
                if (parseTree.end && parseTree.end.comments_before && !parseTree.end._comments_dumped) {
                    parseTree.end.comments_before.forEach(function (comment) {
                        if (this.isPretty || shouldCommentNodeBePreservedInNonPrettyPrintedOutput(parseTree.end, comment)) {
                            if (comment.type === 'comment1') {
                                text += '//' + comment.value + '\n';
                            } else if (comment.type === 'comment2') {
                                text += '/*' + comment.value + '*/';
                            }
                        }
                    }, this);
                }

                this._text = text;

                // Temporary workaround for https://github.com/mishoo/UglifyJS2/issues/218
                parseTree.walk(new uglifyJs.TreeWalker(function (node) {
                    if (node.start) {
                        node.start._comments_dumped = false;
                    }
                    if (node.end) {
                        node.end._comments_dumped = false;
                    }
                }));
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    get parseTree() {
        if (!this._parseTree) {
            var text = this.text;
            // If the source ends with one or more comment, add an empty statement at the end so there's a token
            // for the UglifyJS parser to attach them to (workaround for https://github.com/mishoo/UglifyJS2/issues/180)
            if (/(?:\/\/[^\r\n]*|\*\/)[\r\s\n]*$/.test(text)) {
                text += '\n;';
            }
            try {
                this._parseTree = uglifyJs.parse(text);
            } catch (e) {
                var err = new errors.ParseError({
                    message: 'Parse error in ' + this.urlOrDescription + '\n' + e.message + ' (line ' + e.line + ', column ' + (e.col + 1) + ')',
                    line: e.line,
                    column: e.col + 1,
                    asset: this
                });
                if (this.assetGraph) {
                    this.assetGraph.emit('warn', err);
                } else {
                    throw err;
                }
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
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        /*jshint ignore:start*/
        var parseTree = this.parseTree; // So markDirty removes this._text
        /*jshint ignore:end*/
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [],
            syntaxErrors = [],
            warnings = [],
            infos = [],
            assetGraph = this.assetGraph;

        // Register any shim dependencies as outgoign relations
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
            if (node instanceof uglifyJs.AST_Constant) {
                return node;
            } else {
                var foldedNode = uglifyAst.foldConstant(node);
                if (foldedNode instanceof uglifyJs.AST_String) {
                    this.markDirty();
                    return foldedNode;
                } else {
                    return node;
                }
            }
        }.bind(this);

        var seenComments = [];

        var walker = new uglifyJs.TreeWalker(function (node, descend) {
            var stack = walker.stack,
                parentNode = walker.parent();
            [node.start, node.end].forEach(function (token) {
                if (token && token.comments_before) {
                    token.comments_before.forEach(function (comment) {
                        var matchSourceUrlOrSourceMappingUrl = comment.value.match(/[@#]\s*source(Mapping)?URL=([^\s\n]*)/);
                        if (matchSourceUrlOrSourceMappingUrl && seenComments.indexOf(comment) === -1) {
                            if (matchSourceUrlOrSourceMappingUrl[1] === 'Mapping') {
                                outgoingRelations.push(new AssetGraph.JavaScriptSourceMappingUrl({
                                    from: this,
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
                                    from: this,
                                    node: comment,
                                    to: {
                                        url: matchSourceUrlOrSourceMappingUrl[2]
                                    }
                                }));
                            }
                            seenComments.push(comment);
                        }
                    }, this);
                }
            }, this);

            // Detect global 'use strict' directives
            if (parentNode === this.parseTree &&
                node instanceof uglifyJs.AST_Directive &&
                node.value === 'use strict') {
                this.strict = true;
            }

            if (node instanceof uglifyJs.AST_Call) {
                var parentParentNode = stack[stack.length - 3];
                if (node.expression instanceof uglifyJs.AST_Dot && node.expression.property === 'module' &&
                    node.expression.expression instanceof uglifyJs.AST_SymbolRef &&
                    node.expression.expression.name === 'angular') {

                    var diveIntoAngularMethodCall = function (argumentNodes, templateCacheVariableName) {
                        var angularWalker = new uglifyJs.TreeWalker(function (node) {
                            var parentNode = angularWalker.parent();
                            if (node instanceof uglifyJs.AST_Object) {
                                node.properties.forEach(function (keyValue) {
                                    if (keyValue.key === 'templateUrl' && keyValue.value instanceof uglifyJs.AST_String) {
                                        outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplate({
                                            from: this,
                                            to: {
                                                type: 'Html',
                                                url: keyValue.value.value
                                            },
                                            node: keyValue,
                                            parentNode: node
                                        }));
                                    } else if (keyValue.key === 'template' && keyValue.value instanceof uglifyJs.AST_String) {
                                        outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplate({
                                            from: this,
                                            to: new AssetGraph.Html({
                                                text: keyValue.value.value
                                            }),
                                            node: keyValue,
                                            parentNode: node
                                        }));
                                    }
                                }, this);
                            } else if (node instanceof uglifyJs.AST_SimpleStatement) {
                                if (parentNode instanceof uglifyJs.AST_Function) {
                                    // Use the statements array of the function instead:
                                    parentNode = parentNode.body;
                                }
                                if (node.body instanceof uglifyJs.AST_Call &&
                                    node.body.expression instanceof uglifyJs.AST_Dot &&
                                    node.body.expression.property === 'put' &&
                                    node.body.expression.expression instanceof uglifyJs.AST_SymbolRef &&
                                    node.body.expression.expression.name === templateCacheVariableName &&
                                    node.body.args.length === 2 &&
                                    node.body.args[0] instanceof uglifyJs.AST_String &&
                                    node.body.args[1] instanceof uglifyJs.AST_String) {

                                    outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplateCacheAssignment({
                                        from: this,
                                        to: new AssetGraph.Html({
                                            isExternalizable: false,
                                            text: node.body.args[1].value
                                        }),
                                        node: node,
                                        parentNode: parentNode
                                    }));
                                }
                            }
                        }.bind(this));
                        argumentNodes.forEach(function (argumentNode) {
                            argumentNode.walk(angularWalker);
                        });
                    }.bind(this);

                    var stackPosition = stack.length - 1;
                    while (stack[stackPosition - 1] instanceof uglifyJs.AST_Dot && stack[stackPosition - 2] instanceof uglifyJs.AST_Call) {
                        var callNode = stack[stackPosition - 2],
                            methodName = stack[stackPosition - 1].property,
                            argumentNodes = callNode.args,
                            templateCacheVariableName;

                        if (methodName === 'run' &&
                            argumentNodes.length > 0 &&
                            argumentNodes[0] instanceof uglifyJs.AST_Array &&
                            argumentNodes[0].elements.length === 2 &&
                            argumentNodes[0].elements[0] instanceof uglifyJs.AST_String &&
                            argumentNodes[0].elements[0].value === '$templateCache' &&
                            argumentNodes[0].elements[1] instanceof uglifyJs.AST_Function) {

                            templateCacheVariableName = argumentNodes[0].elements[1].argnames[0].name;
                        }
                        diveIntoAngularMethodCall(argumentNodes, templateCacheVariableName);
                        stackPosition -= 2;
                    }
                }

                if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'INCLUDE') {
                    if (node.args.length === 1 && node.args[0] instanceof uglifyJs.AST_String) {
                        outgoingRelations.push(new AssetGraph.JavaScriptInclude({
                            from: this,
                            to: {
                                url: node.args[0].value
                            },
                            node: node,
                            detachableNode: parentNode instanceof uglifyJs.AST_Seq ? node : parentNode,
                            parentNode: parentNode instanceof uglifyJs.AST_Seq ? parentNode : parentParentNode
                        }));
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: 'Invalid INCLUDE syntax: Must take a single string argument:' + node.print_to_string(),
                            asset: this
                        }));
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'GETTEXT') {
                    if (node.args.length === 1) {
                        // TRHTML(GETTEXT(...)) is covered by TRHTML below:
                        if (!(parentNode instanceof uglifyJs.AST_Call) || !(parentNode.expression instanceof uglifyJs.AST_Symbol) || parentNode.expression.name !== 'TRHTML') {
                            node.args[0] = tryFoldConstantToString(node.args[0]);
                            if (node.args[0] instanceof uglifyJs.AST_String) {
                                outgoingRelations.push(new AssetGraph.JavaScriptGetText({
                                    parentNode: parentNode,
                                    from: this,
                                    to: {
                                        url: node.args[0].value
                                    },
                                    node: node
                                }));
                            } else {
                                syntaxErrors.push(new errors.SyntaxError({
                                    message: 'Invalid GETTEXT syntax: ' + node.print_to_string(),
                                    asset: this
                                }));
                            }
                        }
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: 'Invalid GETTEXT syntax: ' + node.print_to_string(),
                            asset: this
                        }));
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'GETSTATICURL') {
                    outgoingRelations.push(new AssetGraph.JavaScriptGetStaticUrl({
                        from: this,
                        parentNode: parentNode,
                        node: node,
                        to: new AssetGraph.StaticUrlMap({
                            parseTree: node.clone().args
                        })
                    }));
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'TRHTML') {
                    var outgoingRelation;
                    if (node.args[0] instanceof uglifyJs.AST_Call && node.args[0].expression instanceof uglifyJs.AST_Symbol && node.args[0].expression.name === 'GETTEXT' && node.args[0].args.length === 1) {

                        node.args[0].args[0] = tryFoldConstantToString(node.args[0].args[0]);
                        if (node.args[0].args[0] instanceof uglifyJs.AST_String) {
                            outgoingRelation = new AssetGraph.JavaScriptTrHtml({
                                from: this,
                                parentNode: parentNode,
                                node: node,
                                to: {
                                    url: node.args[0].args[0].value
                                }
                            });
                        }
                    } else {
                        node.args[0] = tryFoldConstantToString(node.args[0]);
                        if (node.args[0] instanceof uglifyJs.AST_String) {
                            outgoingRelation = new AssetGraph.JavaScriptTrHtml({
                                from: this,
                                parentNode: parentNode,
                                node: node,
                                to: new AssetGraph.Html({
                                    node: node,
                                    text: node.args[0].value
                                })
                            });
                        }
                    }
                    if (outgoingRelation) {
                        outgoingRelations.push(outgoingRelation);
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: 'Invalid TRHTML syntax: ' + node.print_to_string(),
                            asset: this
                        }));
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol &&
                           (node.expression.name === 'require' || node.expression.name === 'requirejs') &&
                           ((node.args.length === 2 && node.args[1] instanceof uglifyJs.AST_Function) || node.args.length === 1) &&
                           node.args[0] instanceof uglifyJs.AST_Array) {
                    // There's no 3 argument version of require, so check whether the require is succeeded by define('moduleName', ...);
                    // like flattenRequireJs and r.js would output. If it is, don't model it as a relation.
                    var parentIndex = stack.length - 1,
                        isSucceededByDefineWithStringArg = false,
                        seenDefine = false,
                        walkFn = function (_node) {
                            if (_node === node) {
                                seenDefine = true;
                            } else if (seenDefine && isNamedDefineNode(_node)) {
                                isSucceededByDefineWithStringArg = true;
                            }
                        };
                    OUTER:
                    while (parentIndex >= 0) {
                        if (stack[parentIndex] instanceof uglifyJs.AST_Block) {
                            var blockNode = stack[parentIndex];
                            for (var i = blockNode.body.indexOf(stack[parentIndex + 1]) ; i < blockNode.body.length ; i += 1) {
                                if (blockNode.body[i] instanceof uglifyJs.AST_SimpleStatement && isNamedDefineNode(blockNode.body[i].body)) {
                                    isSucceededByDefineWithStringArg = true;
                                    break OUTER;
                                }
                            }
                            break OUTER;
                        } else if (stack[parentIndex] instanceof uglifyJs.AST_Seq) {
                            stack[parentIndex].walk(new uglifyJs.TreeWalker(walkFn));
                            break OUTER;
                        } else {
                            parentIndex -= 1;
                        }
                    }

                    if (!isSucceededByDefineWithStringArg) {
                        var arrayNode = node.args[0];
                        arrayNode.elements.forEach(function (arrayItemAst, i) {
                            arrayItemAst = arrayNode.elements[i] = tryFoldConstantToString(arrayItemAst);
                            if (arrayItemAst instanceof uglifyJs.AST_String) {
                                if (['require', 'exports', 'module'].indexOf(arrayItemAst.value) === -1) {
                                    var outgoingRelation = new AssetGraph.JavaScriptAmdRequire({
                                        requireJsConfig: this.assetGraph && this.assetGraph.requireJsConfig, // Hmmm
                                        from: this,
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
                            } else {
                                infos.push(new errors.SyntaxError('Skipping non-string JavaScriptAmdRequire item: ' + node.print_to_string()));
                            }
                        }, this);
                    }
                } else if (this.isRequired && node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'define') {
                    if (node.args.length === 2 && node.args[0] instanceof uglifyJs.AST_Array) {
                        var arrayNode = node.args[0];
                        arrayNode.elements.forEach(function (arrayItemAst, i) {
                            arrayNode.elements[i] = arrayItemAst = tryFoldConstantToString(arrayItemAst);
                            if (arrayItemAst instanceof uglifyJs.AST_String) {
                                if (['require', 'exports', 'module'].indexOf(arrayItemAst.value) === -1) {
                                    var outgoingRelation = new AssetGraph.JavaScriptAmdDefine({
                                        requireJsConfig: this.assetGraph && this.assetGraph.requireJsConfig, // Hmmm
                                        from: this,
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
                            } else {
                                warnings.push(new errors.SyntaxError('Skipping non-string JavaScriptAmdDefine item: ' + node.print_to_string()));
                            }
                        }, this);
                    }
                    // Keep track of the fact that we're in the body of a define(function () {...}) that might contain
                    // JavaScriptRequireJsCommonJsCompatibilityRequire relations
                    var lastArgument = node.args.length > 0 && node.args[node.args.length - 1];
                    if (lastArgument && lastArgument instanceof uglifyJs.AST_Function) {
                        nestedDefineNodes.push(node);
                        descend();
                        nestedDefineNodes.pop();
                        return true; // Tell the TreeWalker not to descend again
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'require' &&
                           node.args.length === 1 && node.args[0] instanceof uglifyJs.AST_String) {
                    if (nestedDefineNodes.length > 0) {
                        var parentDefineNode = nestedDefineNodes[nestedDefineNodes.length - 1];
                        if (!(parentDefineNode.args[0] instanceof uglifyJs.AST_String)) {
                            var outgoingRelation = new AssetGraph.JavaScriptRequireJsCommonJsCompatibilityRequire({
                                parentDefineNode: parentDefineNode,
                                requireJsConfig: this.assetGraph && this.assetGraph.requireJsConfig, // Hmmm
                                from: this,
                                node: node
                            });
                            outgoingRelation.to = {
                                url: outgoingRelation.targetUrl,
                                isRequired: true
                            };
                            outgoingRelations.push(outgoingRelation);
                        }
                    } else if (!this.isRequired) {
                        var baseUrl = this.nonInlineAncestor.url;
                        if (/^file:/.test(baseUrl)) {
                            var resolvedCommonJsModuleName = resolveCommonJsModuleName(urlTools.fileUrlToFsPath(baseUrl), node.args[0].value);

                            // Skip built-in and unresolvable modules (they just resolve to 'fs', 'util', etc., not a file name):
                            if (!resolvedCommonJsModuleName) {
                                warnings.push(new errors.SyntaxError({message: 'Couldn\'t resolve ' + node.print_to_string() + ', skipping', relationType: 'JavaScriptCommonJsRequire'}));
                            } else if (/^\//.test(resolvedCommonJsModuleName)) {
                                outgoingRelations.push(new AssetGraph.JavaScriptCommonJsRequire({
                                    from: this,
                                    to: {
                                        url: urlTools.fsFilePathToFileUrl(resolvedCommonJsModuleName)
                                    },
                                    node: node
                                }));
                            }
                        } else {
                            warnings.push(new errors.SyntaxError({message: 'Skipping JavaScriptCommonJsRequire (only supported from file: urls): ' + node.print_to_string(), relationType: 'JavaScriptCommonJsRequire'}));
                        }
                    }
                }
            }
        }.bind(this));

        this.parseTree.walk(walker);

        if (syntaxErrors.length) {
            if (this.assetGraph) {
                syntaxErrors.forEach(function (syntaxError) {
                    syntaxError.asset = this;
                    this.assetGraph.emit('warn', syntaxError);
                }, this);
            } else {
                throw new Error(_.pluck(errors, 'message').join('\n'));
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

// Expose the right version of uglify-js and uglifyast so instanceof checks won't fail

JavaScript.uglifyJs = uglifyJs;
JavaScript.uglifyAst = uglifyAst;

module.exports = JavaScript;

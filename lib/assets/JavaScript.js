var util = require('util'),
    _ = require('underscore'),
    uglifyJs = require('uglify-js'),
    uglifyAst = require('uglifyast')(uglifyJs),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    errors = require('../errors'),
    Text = require('./Text'),
    deepCopy = require('../util/deepCopy'),
    urlTools = require('../util/urlTools'),
    AssetGraph = require('../AssetGraph');

function JavaScript(config) {
    Text.call(this, config);
}

// Mutate the node to a constant folded version if necessary:
function constantFoldNode(node) {
    return node.transform(uglifyJs.Compressor());
}

util.inherits(JavaScript, Text);

extendWithGettersAndSetters(JavaScript.prototype, {
    contentType: 'application/javascript', // TODO: Double check that this is everyone's recommended value

    supportedExtensions: ['.js'],

    isPretty: false,

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                var outputStream = uglifyJs.OutputStream({
                    // Preserve all comments when isPretty is true, and only preserve copyright notices/license info
                    // when it's false:
                    comments: this.isPretty || function (node, comment) {
                        return comment.type === 'comment2' && /@preserve|@license|@cc_on|^!/.test(comment.value);
                    },
                    beautify: this.isPretty,
                    source_map: null
                });
                this._parseTree.print(outputStream);
                this._text = outputStream.get().replace(/;*$/, ';'); // Always end with a semicolon like the UglifyJS binary
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
                this._parseTree = uglifyJs.parse(text);
            } catch (e) {
                var err = new errors.ParseError({
                    message: 'Parse error in ' + this.urlOrDescription + '\n' + e.message + ' (line ' + e.line + ', column ' + (e.col + 1) + ')',
                    line: e.line,
                    column: e.col + 1,
                    asset: this
                });
                if (this.assetGraph) {
                    this.assetGraph.emit('error', err);
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
        return this.parseTree[1].length === 0;
    },

    minify: function () {
        this.isPretty = false;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
        return this;
    },

    prettyPrint: function () {
        this.isPretty = true;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
        return this;
    },

    findOutgoingRelationsInParseTree: function () {
        var outgoingRelations = [],
            syntaxErrors = [],
            warnings = [],
            isSeenNamedAmdDefinesByModuleName = {},
            assetGraph = this.assetGraph;

        function resolveRequireJsRelation(relation) {
            if (assetGraph.requireJsConfig) {
                return assetGraph.requireJsConfig.resolveUrl(relation.href, relation.baseAsset.url);
            } else {
                return relation.href;
            }
        }

        if (assetGraph && assetGraph.requireJsConfig && this.incomingRelations.some(function (incomingRelation) {return /^JavaScript(?:ShimRequire|Amd(?:Define|Require))$/.test(incomingRelation.type);})) {
            var moduleName = assetGraph.requireJsConfig.getModuleName(this, new AssetGraph.JavaScriptShimRequire({from: this}).baseAsset.url), // Argh!
                shimConfig = assetGraph.requireJsConfig.shim[moduleName];
            if (shimConfig && shimConfig.deps) {
                assetGraph.requireJsConfig.shim[moduleName].deps.forEach(function (shimModuleName) {
                    var outgoingRelation = new AssetGraph.JavaScriptShimRequire({
                        from: this,
                        href: shimModuleName
                    });
                    outgoingRelation.to = {url: resolveRequireJsRelation(outgoingRelation)};
                    outgoingRelations.push(outgoingRelation);
                }, this);
            }
        }

        var walker = new uglifyJs.TreeWalker(function (node) {
            var stack = walker.stack,
                parentNode = walker.parent();
            if (node instanceof uglifyJs.AST_Call) {
                var parentParentNode = stack[stack.length - 3];

                if (parentNode instanceof uglifyJs.AST_Toplevel) {
                    parentNode = parentNode.body;
                }
                if (parentParentNode instanceof uglifyJs.AST_Toplevel) {
                    parentParentNode = parentParentNode.body;
                }

                if (node.expression instanceof uglifyJs.AST_Dot && node.expression.property === 'module' &&
                    node.expression.expression instanceof AST_SymbolRef &&
                    node.expression.expression.name === 'angular') {

                    var diveIntoAngularMethodCall = function (argumentNodes, templateCacheVariableName) {
                        var angularWalker = new uglifyJs.TreeWalker(function (node) {
                            var stack = angularWalker.stack,
                                parentNode = angularWalker.parent();
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
                                    } else if (keyValue.key === 'template' && keyValue.value instanceof uglifyJs.AST_String === 'string') {
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
                            } else if (node instanceof uglifyJs.AST_Stat) {
                                if (parentNode instanceof uglifyJs.AST_ === 'function') {
                                    // Use the statements array of the function instead:
                                    parentNode = parentNode.body;
                                }
                                if (node.body instanceof uglifyJs.AST_Call && node.body.expression instanceof uglifyJs.AST_PropAccess &&
                                    node.body.expression.property === 'put' &&
                                    node.body.expression.expression instanceof uglifyJs.AST_SymbolRef &&
                                    node.body.expression.expression.name === templateCacheVariableName &&
                                    node.args.length === 2 &&
                                    node.args[0] instanceof uglifyJs.AST_String &&
                                    node.args[1] instanceof uglifyJs.AST_String) {

                                    outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplateCacheAssignment({
                                        from: this,
                                        to: new AssetGraph.Html({
                                            isExternalizable: false,
                                            text: node.args[1].value
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
                        if (methodName === 'run' && argumentNodes.length > 0 && argumentNodes[0] instanceof AST_Array === 'array' && argumentNodes[0].elements.length === 2 &&
                            argumentNodes[0].elements[0] instanceof uglifyJs.AST_String && argumentNodes[0].elements[0].value === '$templateCache' &&
                            argumentNodes[0].elements[1] instanceof uglifyJs.AST_Function) {

                            templateCacheVariableName = argumentNodes[0].elements[1].argnames[0];
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
                            message: "Invalid INCLUDE syntax: Must take a single string argument:" + node.print_to_string(),
                            asset: this
                        }));
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'GETTEXT') {
                    if (node.args.length === 1) {
                        // TRHTML(GETTEXT(...)) is covered by TRHTML below:
                        if (!(parentNode instanceof uglifyJs.AST_Call) || !(parentNode.expression instanceof uglifyJs.AST_Symbol) || parentNode.expression.name !== 'TRHTML') {
                            node.args[0] = constantFoldNode(node.args[0]);
                            if (node.args[0] instanceof uglifyJs.AST_String) {
                                outgoingRelations.push(new AssetGraph.JavaScriptGetText({
                                    parentNode: parentNode,
                                    from: this,
                                    to: {
                                        url: node.args[0].value
                                    },
                                    node: node,
                                    parentNode: parentNode
                                }));
                            } else {
                                syntaxErrors.push(new errors.SyntaxError({
                                    message: "Invalid GETTEXT syntax: " + node.print_to_string(),
                                    asset: this
                                }));
                            }
                        }
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: "Invalid GETTEXT syntax: " + node.print_to_string(),
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

                        node.args[0].args[0] = constantFoldNode(node.args[0].args[0]);
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
                        node.args[0] = constantFoldNode(node.args[0]);
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
                            message: "Invalid TRHTML syntax: " + node.print_to_string(),
                            asset: this
                        }));
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'require' &&
                           ((node.args.length === 2 && node.args[1] instanceof uglifyJs.AST_Function) || node.args.length === 1) &&
                           node.args[0] instanceof uglifyJs.AST_Array) {
                    var arrayNode = node.args[0];
                    arrayNode.elements.forEach(function (arrayItemAst, i) {
                        arrayItemAst = arrayNode.elements[i] = constantFoldNode(arrayItemAst);
                        if (arrayItemAst instanceof uglifyJs.AST_String) {
                            if (!isSeenNamedAmdDefinesByModuleName[arrayItemAst.value] && arrayItemAst.value !== 'exports') {
                                var outgoingRelation = new AssetGraph.JavaScriptAmdRequire({
                                    from: this,
                                    callNode: node,
                                    arrayNode: arrayNode,
                                    node: arrayItemAst
                                });
                                outgoingRelation.to = {url: resolveRequireJsRelation(outgoingRelation)};
                                outgoingRelations.push(outgoingRelation);
                            }
                        } else {
                            warnings.push(new errors.SyntaxError('Skipping non-string JavaScriptAmdRequire item: ' + node.print_to_string()));
                        }
                    }, this);
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'define') {
                    var arrayNode;
                    if (node.args.length > 1 && node.args[0] instanceof uglifyJs.AST_String) {
                        isSeenNamedAmdDefinesByModuleName[node.args[0].value] = true;
                    }
                    if (node.args.length === 3 && node.args[0] instanceof uglifyJs.AST_String && node.args[1] instanceof uglifyJs.AST_Array) {
                        arrayNode = node.args[1];
                    } else if (node.args.length === 2 && node.args[0] instanceof uglifyJs.AST_Array) {
                        arrayNode = node.args[0];
                    }
                    if (arrayNode) {
                        arrayNode.elements.forEach(function (arrayItemAst, i) {
                            arrayNode.elements[i] = arrayItemAst = constantFoldNode(arrayItemAst);
                            if (arrayItemAst instanceof uglifyJs.AST_String) {
                                if (!isSeenNamedAmdDefinesByModuleName[arrayItemAst.value] && arrayItemAst.value !== 'exports') {
                                    var outgoingRelation = new AssetGraph.JavaScriptAmdDefine({
                                        from: this,
                                        callNode: node,
                                        arrayNode: arrayNode,
                                        node: arrayItemAst
                                    });
                                    outgoingRelation.to = {url: resolveRequireJsRelation(outgoingRelation)};
                                    outgoingRelations.push(outgoingRelation);
                                }
                            } else {
                                warnings.push(new errors.SyntaxError('Skipping non-string JavaScriptAmdDefine item: ' + node.print_to_string()));
                            }
                        }, this);
                    }
                } else if (node.expression instanceof uglifyJs.AST_Symbol && node.expression.name === 'require' &&
                           node.args.length === 1 && node.args[0] instanceof uglifyJs.AST_String) {
                    var baseUrl = this.nonInlineAncestor.url;
                    if (/^file:/.test(baseUrl)) {
                        var Module = require('module'),
                            path = require('path'),
                            fileName = urlTools.fileUrlToFsPath(baseUrl),
                            fakeModule = new Module(fileName),
                            resolvedFileName;
                        fakeModule.filename = fileName;
                        fakeModule.paths = Module._nodeModulePaths(path.dirname(fakeModule.filename));

                        try {
                            resolvedFileName = Module._resolveFilename(node.args[0].value, fakeModule);
                            if (Array.isArray(resolvedFileName)) {
                                resolvedFileName = resolvedFileName[0]; // Node 0.4?
                            }
                        } catch (e) {
                            warnings.push(new errors.SyntaxError({message: "Couldn't resolve " + node.print_to_string() + ", skipping", relationType: 'JavaScriptCommonJsRequire'}));
                        }
                        // Skip built-in and unresolvable modules (they just resolve to 'fs', 'util', etc., not a file name):
                        if (/^\//.test(resolvedFileName)) {
                            outgoingRelations.push(new AssetGraph.JavaScriptCommonJsRequire({
                                from: this,
                                to: {
                                    url: urlTools.fsFilePathToFileUrl(resolvedFileName)
                                },
                                node: node
                            }));
                        }
                    } else {
                        warnings.push(new errors.SyntaxError({message: 'Skipping JavaScriptCommonJsRequire (only supported from file: urls): ' + node.print_to_string(), relationType: 'JavaScriptCommonJsRequire'}));
                    }
                }
            }
        }.bind(this));

        this.parseTree.walk(walker);

        if (syntaxErrors.length) {
            if (this.assetGraph) {
                syntaxErrors.forEach(function (syntaxError) {
                    syntaxError.asset = this;
                    this.assetGraph.emit('error', syntaxError);
                }, this);
            } else {
                throw new Error(_.pluck(errors, 'message').join("\n"));
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
        return outgoingRelations;
    }
});

// Grrr...
JavaScript.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

module.exports = JavaScript;

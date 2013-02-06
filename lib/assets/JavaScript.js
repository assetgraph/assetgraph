var util = require('util'),
    _ = require('underscore'),
    uglifyJs = require('uglify-js-papandreou'),
    uglifyAst = require('uglifyast'),
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
    if (!/^(?:string|number|name)$/.test(node[0])) {
        Array.prototype.splice.apply(node, [0, node.length].concat(uglifyAst.foldConstant(node)));
    }
    return node;
}

util.inherits(JavaScript, Text);

extendWithGettersAndSetters(JavaScript.prototype, {
    contentType: 'application/javascript', // TODO: Double check that this is everyone's recommended value

    supportedExtensions: ['.js'],

    isPretty: false,

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                var text = '';
                (this.copyrightNoticeComments || []).forEach(function (comment) {
                    text += "/*" + comment.value + "*/";
                });
                text += uglifyJs.uglify.gen_code(this._parseTree, {beautify: this.isPretty, quote_char: this.quoteChar || null});
                this._text = text.replace(/;*$/, ";"); // Always end the file with a semicolon like the UglifyJS binary
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    get parseTree() {
        if (!this._parseTree) {
            var text = this.text,
                firstToken = uglifyJs.parser.tokenizer(text)();
            if (firstToken) {
                this.copyrightNoticeComments = firstToken.comments_before.filter(function (comment) {
                    return /^!/.test(comment.value);
                });
            }
            try {
                this._parseTree = uglifyJs.parser.parse(text);
            } catch (e) {
                var err = new errors.ParseError({
                    message: 'Parse error in ' + this.urlOrDescription + '\n' + e.message + ' (line ' + e.line + ', column ' + e.col + ')',
                    line: e.line,
                    column: e.col,
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
            isSeenNamedAmdDefinesByModuleName = {};

        var extractStringNodes = function (arrayOrStringOrObjectAst, errorMessage) {
            var stringNodes = [];

            if (arrayOrStringOrObjectAst[0] === 'string') {
                stringNodes = [arrayOrStringOrObjectAst];
            } else if (arrayOrStringOrObjectAst[0] === 'array' && arrayOrStringOrObjectAst[1].every(function (node) {return node[0] === 'string';})) {
                stringNodes = arrayOrStringOrObjectAst[1];
            } else if (arrayOrStringOrObjectAst[0] === 'object' && arrayOrStringOrObjectAst[1].every(function (keyValue) {return keyValue[1][0] === 'string';})) {
                stringNodes = arrayOrStringOrObjectAst[1].map(function (keyValue) {
                    return keyValue[1];
                });
            } else {
                syntaxErrors.push(new errors.SyntaxError({
                    message: errorMessage + ': first argument must be string or array of strings: ' + JSON.stringify(arrayOrStringOrObjectAst),
                    asset: this
                }));
            }
            return stringNodes;
        }.bind(this);

        var assetGraph = this.assetGraph;

        function resolveRequireJsUrl(url) {
            if (assetGraph.requireJsConfig) {
                return assetGraph.requireJsConfig.resolveUrl(url);
            } else {
                return url;
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
                    outgoingRelation.to = {url: resolveRequireJsUrl(outgoingRelation.href)};
                    outgoingRelations.push(outgoingRelation);
                }, this);
            }
        }

        var parseTree = this.parseTree,
            walker = uglifyJs.uglify.ast_walker();
        walker.with_walkers({
            call: function () {
                var stack = walker.stack(),
                    node = stack[stack.length - 1],
                    parentNode = walker.parent(),
                    parentParentNode = stack[stack.length - 3];

                if (parentNode[0] === 'toplevel') {
                    parentNode = parentNode[1];
                }
                if (parentParentNode[0] === 'toplevel') {
                    parentParentNode = parentParentNode[1];
                }

                if (node[1][0] === 'dot' &&
                    node[1][1][0] === 'name' && node[1][1][1] === 'angular' && node[1][2] === 'module') {

                    var diveIntoAngularMethodCall = function (argumentNodes, templateCacheVariableName) {
                        var angularWalker = uglifyJs.uglify.ast_walker();
                        angularWalker.with_walkers({
                            object: function () {
                                var stack = angularWalker.stack(),
                                    node = stack[stack.length - 1];
                                node[1].forEach(function (keyValue) {
                                    if (keyValue[0] === 'templateUrl' && keyValue[1][0] === 'string') {
                                        outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplate({
                                            from: this,
                                            to: {
                                                type: 'Html',
                                                url: keyValue[1][1]
                                            },
                                            node: keyValue,
                                            parentNode: node
                                        }));
                                    } else if (keyValue[0] === 'template' && keyValue[1][0] === 'string') {
                                        outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplate({
                                            from: this,
                                            to: new AssetGraph.Html({
                                                text: keyValue[1][1]
                                            }),
                                            node: keyValue,
                                            parentNode: node
                                        }));
                                    }
                                }, this);
                            }.bind(this),
                            stat: function () {
                                var stack = angularWalker.stack(),
                                    node = stack[stack.length - 1],
                                    parentNode = stack[stack.length - 2];
                                if (parentNode[0] === 'function') {
                                    // Use the statements array of the function instead:
                                    parentNode = parentNode[3];
                                }
                                if (node[1][0] === 'call' && node[1][1][0] === 'dot' && node[1][1][1][0] === 'name' &&
                                    templateCacheVariableName === node[1][1][1][1] !== -1 && node[1][1][2] === 'put' &&
                                    node[1][2].length === 2 && node[1][2][0][0] === 'string' && node[1][2][1][0] === 'string') {
                                    outgoingRelations.push(new AssetGraph.JavaScriptAngularJsTemplateCacheAssignment({
                                        from: this,
                                        to: new AssetGraph.Html({
                                            isExternalizable: false,
                                            text: node[1][2][1][1]
                                        }),
                                        node: node,
                                        parentNode: parentNode
                                    }));
                                }
                            }.bind(this)
                        }, function () {
                            argumentNodes.forEach(function (argumentNode) {
                                angularWalker.walk(argumentNode);
                            });
                        });
                    }.bind(this);

                    var stackPosition = stack.length - 1;
                    while (stack[stackPosition - 1][0] === 'dot' && stack[stackPosition - 2][0] === 'call') {
                        var callNode = stack[stackPosition - 2],
                            methodName = stack[stackPosition - 1][2],
                            argumentNodes = callNode[2],
                            templateCacheVariableName;
                        if (methodName === 'run' && argumentNodes.length > 0 && argumentNodes[0][0] === 'array' && argumentNodes[0][1].length === 2 &&
                            argumentNodes[0][1][0][0] === 'string' && argumentNodes[0][1][0][1] === '$templateCache' &&
                            argumentNodes[0][1][1][0] === 'function') {

                            templateCacheVariableName = argumentNodes[0][1][1][2][0];
                        }
                        diveIntoAngularMethodCall(argumentNodes, templateCacheVariableName);
                        stackPosition -= 2;
                    }
                }

                if (node[1][0] === 'name' && node[1][1] === 'INCLUDE') {
                    if (node[2].length === 1 && node[2][0][0] === 'string') {
                        outgoingRelations.push(new AssetGraph.JavaScriptInclude({
                            from: this,
                            to: {
                                url: node[2][0][1]
                            },
                            node: node,
                            detachableNode: parentNode[0] === 'seq' ? node : parentNode,
                            parentNode: parentNode[0] === 'seq' ? parentNode : parentParentNode
                        }));
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: "Invalid INCLUDE syntax: Must take a single string argument:" + uglifyJs.uglify.gen_code(node),
                            asset: this
                        }));
                    }
                } else if (node[1][0] === 'name' && node[1][1] === 'GETTEXT') {
                    if (node[2].length === 1) {
                        // TRHTML(GETTEXT(...)) is covered by TRHTML below:
                        if (parentNode[0] !== 'call' || parentNode[1][0] !== 'name' || parentNode[1][1] !== 'TRHTML') {
                            constantFoldNode(node[2][0]);
                            if (node[2][0][0] === 'string') {
                                outgoingRelations.push(new AssetGraph.JavaScriptGetText({
                                    from: this,
                                    to: {
                                        url: node[2][0][1]
                                    },
                                    node: node,
                                    parentNode: parentNode
                                }));
                            } else {
                                syntaxErrors.push(new errors.SyntaxError({
                                    message: "Invalid GETTEXT syntax: " + uglifyJs.uglify.gen_code(node),
                                    asset: this
                                }));
                            }
                        }
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: "Invalid GETTEXT syntax: " + uglifyJs.uglify.gen_code(node),
                            asset: this
                        }));
                    }
                } else if (node[1][0] === 'name' && node[1][1] === 'GETSTATICURL') {
                    outgoingRelations.push(new AssetGraph.JavaScriptGetStaticUrl({
                        from: this,
                        node: node,
                        to: new AssetGraph.StaticUrlMap({
                            parseTree: deepCopy(node[2])
                        })
                    }));
                } else if (node[1][0] === 'name' && node[1][1] === 'TRHTML') {
                    var outgoingRelation;
                    if (node[2][0][0] === 'call' && node[2][0][1][0] === 'name' && node[2][0][1][1] === 'GETTEXT' && node[2][0][2].length === 1) {

                        constantFoldNode(node[2][0][2][0]);
                        if (node[2][0][2][0][0] === 'string') {
                            outgoingRelation = new AssetGraph.JavaScriptTrHtml({
                                from: this,
                                node: node,
                                to: {
                                    url: node[2][0][2][0][1]
                                }
                            });
                        }
                    } else {
                        constantFoldNode(node[2][0]);
                        if (node[2][0][0] === 'string') {
                            outgoingRelation = new AssetGraph.JavaScriptTrHtml({
                                from: this,
                                node: node,
                                to: new AssetGraph.Html({
                                    node: node,
                                    text: node[2][0][1]
                                })
                            });
                        }
                    }
                    if (outgoingRelation) {
                        outgoingRelations.push(outgoingRelation);
                    } else {
                        syntaxErrors.push(new errors.SyntaxError({
                            message: "Invalid TRHTML syntax: " + uglifyJs.uglify.gen_code(node),
                            asset: this
                        }));
                    }
                } else if (node[1][0] === 'name' && node[1][1] === 'require' &&
                           ((node[2].length === 2 && node[2][1][0] === 'function') || node[2].length === 1) &&
                           node[2][0][0] === 'array') {
                    var arrayNode = node[2][0];
                    arrayNode[1].forEach(function (arrayItemAst) {
                        constantFoldNode(arrayItemAst);
                        if (arrayItemAst[0] === 'string') {
                            if (!isSeenNamedAmdDefinesByModuleName[arrayItemAst[1]] && arrayItemAst[1] !== 'exports') {
                                var outgoingRelation = new AssetGraph.JavaScriptAmdRequire({
                                    from: this,
                                    callNode: node,
                                    arrayNode: arrayNode,
                                    node: arrayItemAst
                                });
                                outgoingRelation.to = {url: resolveRequireJsUrl(outgoingRelation.href)};
                                outgoingRelations.push(outgoingRelation);
                            }
                        } else {
                            warnings.push(new errors.SyntaxError('Skipping non-string JavaScriptAmdRequire item: ' + uglifyJs.uglify.gen_code(node)));
                        }
                    }, this);
                } else if (node[1][0] === 'name' && node[1][1] === 'define') {
                    var arrayNode;
                    if (node[2].length > 1 && node[2][0][0] === 'string') {
                        isSeenNamedAmdDefinesByModuleName[node[2][0][1]] = true;
                    }
                    if (node[2].length === 3 && node[2][0][0] === 'string' && node[2][1][0] === 'array') {
                        arrayNode = node[2][1];
                    } else if (node[2].length === 2 && node[2][0][0] === 'array') {
                        arrayNode = node[2][0];
                    }
                    if (arrayNode) {
                        arrayNode[1].forEach(function (arrayItemAst) {
                            constantFoldNode(arrayItemAst);
                            if (arrayItemAst[0] === 'string') {
                                if (!isSeenNamedAmdDefinesByModuleName[arrayItemAst[1]] && arrayItemAst[1] !== 'exports') {
                                    var outgoingRelation = new AssetGraph.JavaScriptAmdDefine({
                                        from: this,
                                        callNode: node,
                                        arrayNode: arrayNode,
                                        node: arrayItemAst
                                    });
                                    outgoingRelation.to = {url: resolveRequireJsUrl(outgoingRelation.href)};
                                    outgoingRelations.push(outgoingRelation);
                                }
                            } else {
                                warnings.push(new errors.SyntaxError('Skipping non-string JavaScriptAmdDefine item: ' + uglifyJs.uglify.gen_code(node)));
                            }
                        }, this);
                    }
                } else if (node[1][0] === 'name' && node[1][1] === 'require' &&
                           node[2].length === 1 && node[2][0][0] === 'string') {
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
                            resolvedFileName = Module._resolveFilename(node[2][0][1], fakeModule);
                            if (Array.isArray(resolvedFileName)) {
                                resolvedFileName = resolvedFileName[0]; // Node 0.4?
                            }
                        } catch (e) {
                            warnings.push(new errors.SyntaxError({message: "Couldn't resolve " + uglifyJs.uglify.gen_code(node) + ", skipping", relationType: 'JavaScriptCommonJsRequire'}));
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
                        warnings.push(new errors.SyntaxError({message: 'Skipping JavaScriptCommonJsRequire (only supported from file: urls): ' + uglifyJs.uglify.gen_code(node), relationType: 'JavaScriptCommonJsRequire'}));
                    }
                }
            }.bind(this),
            stat: function () {
                var stack = walker.stack(),
                    node = stack[stack.length - 1],
                    parentNode = walker.parent();

                if (parentNode[0] === 'toplevel') {
                    parentNode = parentNode[1];
                }
                if (node[1][0] === 'call' && node[1][1][0] === 'dot' &&
                    node[1][1][1][0] === 'name' && node[1][1][1][1] === 'Ext') {
                    var methodName = node[1][1][2];
                    if (methodName === 'setPath') {
                        // TODO:
                        //
                        // Ext.setPath('Foo', 'path/relative/to/the/html/doc');
                    } else if (methodName === 'create') {
                        // TODO:
                        //
                        // Ext.create('Foo.bar.Quux'); // <-- implicit Ext.require
                    } else if (methodName === 'define') {
                        // Ext.define(className, {
                        //     extend: 'Foo.bar.Quux', // <-- implicit Ext.require
                        //     requires: ['Foo.bar.Blah'], // <-- implicit Ext.require
                        //     mixins: {
                        //         theName: 'Foo.Baz' // <-- implicit Ext.require
                        //     }
                        // })

                        var addRelationsFromExtDefine = function (objAst) {
                            objAst[1].forEach(function (keyValue) {
                                if (/^(?:mixins|requires|extend)$/.test(keyValue[0])) {
                                    extractStringNodes(keyValue[1], 'Invalid Ext.define.' + keyValue[0] + ' syntax').forEach(function (stringNode) {
                                        outgoingRelations.push(new AssetGraph.JavaScriptExtJsRequire({
                                            from: this,
                                            to: {
                                                // Replace first . with : and the rest with /
                                                url: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js'
                                            },
                                            node: stringNode
                                        }));
                                    }, this);
                                }
                            }, this);
                        }.bind(this);

                        if (node[1][2].length >= 2 && node[1][2][0][0] === 'string' && node[1][2][1][0] === 'object') {
                            addRelationsFromExtDefine(node[1][2][1]);
                        } else if (node[1][2].length >= 2 && node[1][2][0][0] === 'string' && node[1][2][1][0] === 'call' && node[1][2][1][1][0] === 'function') {
                            // This makes me want to cry:
                            //
                            // Ext.define("Ext.tip.QuickTipManager", function() {
                            //    var tip, disabled = false;
                            //    return {
                            //        requires: [ "Ext.tip.QuickTip" ],
                            //        singleton: true,
                            //        alternateClassName: "Ext.QuickTips"
                            //    };
                            //    // ...
                            // }());
                            var functionStatements = node[1][2][1][1][3];
                            for (var i = 0 ; i < functionStatements.length ; i += 1) {
                                if (functionStatements[i][0] === 'return' && functionStatements[i][1][0] === 'object') {
                                    addRelationsFromExtDefine(functionStatements[i][1]);
                                    break;
                                }
                            }
                        } else {
                            warnings.push(new errors.NotImplementedError("Skipping unsupported Ext.define syntax: " + uglifyJs.uglify.gen_code(node)));
                        }
                    } else if (methodName === 'exclude') {
                        syntaxErrors.push(new errors.NotImplementedError({message: "Ext.exclude not supported", asset: this}));
                    } else if (methodName === 'require' || methodName === 'syncRequire') {
                        if (node[1][2].length === 0) {
                            syntaxErrors.push(new errors.SyntaxError({message: 'Invalid Ext.require syntax: Must have at least one argument', asset: this}));
                        } else {
                            if (node[1][2][0][0] !== 'name') { // The Ext bootstrapper itself contains some Ext.syncRequire(h) statements
                                extractStringNodes(node[1][2][0], 'Invalid Ext.require syntax').forEach(function (stringNode) {
                                    outgoingRelations.push(new AssetGraph.JavaScriptExtJsRequire({
                                        from: this,
                                        to: {
                                            // Replace first . with : and the rest with /
                                            url: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js'
                                        },
                                        extRequireStatParentNode: parentNode,
                                        extRequireStatNode: node,
                                        node: stringNode
                                    }));
                                }, this);
                            }
                        }
                    }
                }
            }.bind(this)
        }, function () {
            walker.walk(parseTree);
        });

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

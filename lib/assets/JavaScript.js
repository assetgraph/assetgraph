/* eslint no-redeclare: "off", block-scoped-var: "off" */
var util = require('util'),
    _ = require('lodash'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    estraverse = require('estraverse'),
    espurify = require('espurify'),
    sourceMapToAst = require('sourcemap-to-ast'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    repeatString = require('repeat-string'),
    errors = require('../errors'),
    Text = require('./Text'),
    AssetGraph = require('../AssetGraph');

function JavaScript(config) {
    Text.call(this, config);
    this.serializationOptions = this.serializationOptions || {};
}

util.inherits(JavaScript, Text);

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
                semicolons: typeof outputOptions.semicolons === 'undefined' ? this.isPretty || !this.isMinified : outputOptions.semicolons,
                parentheses: typeof outputOptions.parentheses === 'undefined' ? this.isPretty || !this.isMinified : outputOptions.parentheses,
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
            if (this.isInline) {
                // Make sure that '</script>' does not occur inside the script
                text = text.replace(/<\/(?=(\s*)script[\/ >])/gi, '<\\/');

                // Trim trailing whitespace that might occur due to
                // escodegen.generate(ast, {format: { newline: '\n' } });
                text = text.replace(/\s+$/, '');
            } else {
                var lastStatement = parseTree.body.length && parseTree.body[parseTree.body.length - 1];
                if (lastStatement.trailingComments && lastStatement.trailingComments.length > 0) {
                    text = text.replace(/\n?$/, '\n'); // End with a newline if the asset ends with a comment
                } else {
                    text = text.replace(/;*$/, ';'); // Always end with a semicolon like the UglifyJS binary (if non-empty)
                }
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
            var esprimaOptions = {
                // Don't incur the penalty of tracking source locations if source maps are disabled globally:
                loc: !this.assetGraph || this.assetGraph.sourceMaps !== false,
                attachComment: true,
                source: sourceUrl,
                sourceType: 'module',
                jsx: true
            };
            try {
                this._parseTree = esprima.parse(text, esprimaOptions);
                if (this._sourceMap) {
                    this._applySourceMapToParseTree();
                }
            } catch (errorParsingAsModule) {
                esprimaOptions.sourceType = 'script';
                var parsedAsScript = false;
                try {
                    this._parseTree = esprima.parse(text, esprimaOptions);
                    parsedAsScript = true;
                    if (this._sourceMap) {
                        this._applySourceMapToParseTree();
                    }
                } catch (errorParsingAsScript) {
                    var err = new errors.ParseError({
                        message: 'Parse error in ' + this.urlOrDescription + '\n' + errorParsingAsScript.message + ' (line ' + errorParsingAsScript.lineNumber + ')',
                        line: errorParsingAsScript.lineNumber,
                        index: errorParsingAsScript.index,
                        asset: this
                    });
                    if (this.assetGraph) {
                        this.assetGraph.emit('warn', err);
                    } else {
                        throw err;
                    }
                    this._parseTree = esprima.parse('', { loc: true, source: sourceUrl });
                }
                if (this.assetGraph && parsedAsScript) {
                    this.assetGraph.emit('info', new errors.ParseError('Could not parse ' + this.urlOrDescription + ' as a module, fall back to script mode\n' + errorParsingAsModule.message));
                }
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
                var leftoverComments = node[attributeName].filter(JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput);
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

        var that = this;
        var parseTree = this.parseTree;
        var processedComments = [];

        estraverse.traverse(parseTree, {
            enter: function (node, parentNode) {
                ['leadingComments', 'trailingComments'].forEach(function (propertyName) {
                    (node[propertyName] || []).forEach(function (comment) {
                        if (processedComments.indexOf(comment) === -1) {
                            processedComments.push(comment);
                            var matchSourceUrlOrSourceMappingUrl = comment.value.match(/[@#]\s*source(Mapping)?URL=([^\s\n]*)/);
                            if (matchSourceUrlOrSourceMappingUrl) {
                                if (matchSourceUrlOrSourceMappingUrl[1] === 'Mapping') {
                                    outgoingRelations.push(new AssetGraph.JavaScriptSourceMappingUrl({
                                        from: that,
                                        node: comment,
                                        parentNode: node,
                                        commentPropertyName: propertyName,
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
                                        parentNode: node,
                                        commentPropertyName: propertyName,
                                        to: {
                                            url: matchSourceUrlOrSourceMappingUrl[2]
                                        }
                                    }));
                                }
                            } else {
                                var matchSystemJsBundle = comment.value.match(/#\s*SystemJsBundle=([^\s\n]*)/);
                                if (matchSystemJsBundle) {
                                    outgoingRelations.push(new AssetGraph.SystemJsBundle({
                                        from: that,
                                        node: comment,
                                        parentNode: node,
                                        commentPropertyName: propertyName,
                                        to: {
                                            url: matchSystemJsBundle[1]
                                        }
                                    }));
                                }
                            }
                        }
                    });
                });

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
                        node.callee.property.type === 'Identifier' &&
                        node.callee.property.name === 'toString' &&
                        node.callee.object.type === 'Literal' &&
                        typeof node.callee.object.value === 'string' &&
                        node.arguments.length === 1 &&
                        node.arguments[0].type === 'Literal' &&
                        node.arguments[0].value === 'url') {

                        outgoingRelations.push(new AssetGraph.JavaScriptStaticUrl({
                            from: that,
                            node: node,
                            argumentNode: node.callee.object,
                            parentNode: parentNode,
                            to: { url: node.callee.object.value }
                        }));
                    } else if (node.callee.type === 'MemberExpression' &&
                        node.callee.object.type === 'MemberExpression' &&
                        node.callee.object.object.name === 'navigator' &&
                        node.callee.object.property.name === 'serviceWorker' &&
                        node.callee.property.name === 'register' &&
                        typeof node.arguments[0].value === 'string') {

                        // Service worker registration
                        // navigator.serviceWorker.register('sw.js')

                        // Scope detection
                        // if (node.arguments[1] &&
                        //     node.arguments[1].type === 'ObjectExpression'
                        //     ) {
                        //     var scope = that.assetGraph.root;

                        //     node.arguments[1].properties.some(function (property) {
                        //         if (property.key.name === 'scope') {
                        //             scope = property.value.value;
                        //             return true;
                        //         }
                        //     });
                        // }

                        outgoingRelations.push(new AssetGraph.JavaScriptServiceWorkerRegistration({
                            from: that,
                            to: {
                                url: node.arguments[0].value
                            },
                            node: node
                        }));
                    }

                    // JavaScript Fetch
                    if (
                        // fetch('foo')
                        (node.callee.type === 'Identifier' && node.callee.name === 'fetch') ||

                        // window.fetch('foo')
                        (node.callee.type === 'MemberExpression' && !node.callee.computed &&
                         node.callee.property.type === 'Identifier' &&
                         node.callee.property.name === 'fetch' &&
                         node.callee.object.type === 'Identifier' &&
                         node.callee.object.name === 'window'
                        )
                    ) {
                        // First argument must be a string literal
                        if (node.arguments[0] && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
                            outgoingRelations.push(new AssetGraph.JavaScriptFetch({
                                from: that,
                                detachableNode: parentNode.type === 'SequenceExpression' ? node : parentNode,
                                parentNode: parentNode.type === 'SequenceExpression' ? parentNode : parentParentNode,
                                node: node.arguments[0],
                                to: {
                                    url: node.arguments[0].value
                                }
                            }));
                        }
                    } else if (
                        (node.callee.type === 'Identifier' && node.callee.name === 'importScripts') ||
                        (node.callee.type === 'MemberExpression' && !node.callee.computed &&
                         node.callee.property.type === 'Identifier' &&
                         node.callee.property.name === 'importScripts' &&
                         node.callee.object.type === 'Identifier' &&
                         node.callee.object.name === 'self'
                        )
                    ) {
                        node.arguments.forEach(function (argumentNode) {
                            if (argumentNode.type === 'Literal' && typeof argumentNode.value === 'string') {
                                outgoingRelations.push(new AssetGraph.JavaScriptImportScripts({
                                    from: that,
                                    detachableNode: parentNode.type === 'SequenceExpression' ? node : parentNode,
                                    parentNode: parentNode.type === 'SequenceExpression' ? parentNode : parentParentNode,
                                    argumentsNode: node.arguments,
                                    node: argumentNode,
                                    to: {
                                        url: argumentNode.value
                                    }
                                }));
                            }
                        });
                    }
                } else if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Worker' &&
                    node.arguments.length === 1 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {

                    outgoingRelations.push(new AssetGraph.JavaScriptWebWorker({
                        node: node,
                        from: that,
                        to: { url: node.arguments[0].value }
                    }));
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

JavaScript.shouldCommentNodeBePreservedInNonPrettyPrintedOutput = function (comment) {
    return (/@jsx|@preserve|@license|@cc_on|#\s*SystemJsBundle|[@#]\s*sourceURL|[#@]\s*sourceMappingURL|^!/).test(comment.value);
};

module.exports = JavaScript;

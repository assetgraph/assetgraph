var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify-js'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    relations = require('../relations'),
    Text = require('./Text'),
    deepCopy = require('../util/deepCopy'),
    urlTools = require('../util/urlTools');

function JavaScript(config) {
    Text.call(this, config);
}

util.inherits(JavaScript, Text);

extendWithGettersAndSetters(JavaScript.prototype, {
    contentType: 'application/javascript', // TODO: Double check that this is everyone's recommended value

    defaultExtension: '.js',

    isPretty: false,

    get text() {
        if (!('_text' in this)) {
            if (this._parseTree) {
                this._text = uglify.uglify.gen_code(this._parseTree, {beautify: this.isPretty});
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
                this._parseTree = uglify.parser.parse(text);
            } catch (e) {
                // Line are counted from 1, columns from 0:
                throw new Error('Parse error in ' + (this.url || 'inline JavaScript' + (this.nonInlineAncestor ? ' in ' + this.nonInlineAncestor.url : '')) + '\n' +
                                e.message + ' (line ' + (e.line + 1) + ', column ' + e.col + ')');
            }
        }
        return this._parseTree;
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
            errors = [];

        function extractStringNodes(arrayOrStringOrObjectAst, errorMessage) {
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
                errors.push(new Error(errorMessage + ': first argument must be string or array of strings: ' + JSON.stringify(arrayOrStringOrObjectAst)));
            }
            return stringNodes;
        }

        this.parseTree[1]._parent = this.parseTree;
        var stack = [this.parseTree[1]];

        while (stack.length) {
            var node = stack.pop();

            for (var i = node.length - 1 ; i >= 0 ; i--) {
                if (Array.isArray(node[i])) {
                    node[i]._parent = node;
                    stack.push(node[i]);
                }
            }

            if (node[0] === 'call' && node[1][0] === 'dot' && node[1][1][0] === 'name' && node[1][1][1] === 'one') {
                // one.<something>()
                if (node[1][2] === 'include') {
                    if (node[2].length === 1 && node[2][0][0] === 'string') {
                        var detachableNode,
                            parentNode;
                        if (node._parent[0] === 'seq') {
                            detachableNode = node;
                            parentNode = node._parent;
                        } else {
                            // Assume ['stat', ['call', ...]]
                            detachableNode = node._parent;
                            parentNode = node._parent._parent;
                        }
                        outgoingRelations.push(new relations.JavaScriptOneInclude({
                            from: this,
                            to: {
                                url: node[2][0][1]
                            },
                            node: node,
                            detachableNode: detachableNode,
                            parentNode: parentNode
                        }));
                    } else {
                        errors.push(new Error("Invalid one.include syntax: Must take a single string argument:" + uglify.uglify.gen_code(node)));
                    }
                } else if (node[1][2] === 'getText') {
                    if (node[2].length === 1 && node[2][0][0] === 'string') {
                        outgoingRelations.push(new relations.JavaScriptOneGetText({
                            from: this,
                            to: {
                                url: node[2][0][1]
                            },
                            node: node,
                            parentNode: node._parent
                        }));
                    } else {
                        errors.push(new Error("Invalid one.getText syntax: " + uglify.uglify.gen_code(node)));
                    }
                } else if (node[1][2] === 'getStaticUrl') {
                    outgoingRelations.push(new relations.JavaScriptOneGetStaticUrl({
                        from: this,
                        node: node,
                        to: new (require('./StaticUrlMap'))({
                            parseTree: deepCopy(node[2])
                        })
                    }));
                }
            } else if (node[0] === 'stat' && node[1][0] === 'call' && node[1][1][0] === 'dot' &&
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
                                    outgoingRelations.push(new relations.JavaScriptExtJsRequire({
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
                        console.warn("Skipping unsupported Ext.define syntax: " + uglify.uglify.gen_code(node));
                    }
                } else if (methodName === 'exclude') {
                    errors.push(new Error("Ext.exclude not supported"));
                } else if (methodName === 'require' || methodName === 'syncRequire') {
                    if (node[1][2].length === 0) {
                        errors.push(new Error('Invalid Ext.require syntax: Must have at least one argument'));
                    } else {
                        if (node[1][2][0][0] !== 'name') { // The Ext bootstrapper itself contains some Ext.syncRequire(h) statements
                            extractStringNodes(node[1][2][0], 'Invalid Ext.require syntax').forEach(function (stringNode) {
                                outgoingRelations.push(new relations.JavaScriptExtJsRequire({
                                    from: this,
                                    to: {
                                        // Replace first . with : and the rest with /
                                        url: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js'
                                    },
                                    extRequireStatParentNode: node._parent,
                                    extRequireStatNode: node,
                                    node: stringNode
                                }));
                            }, this);
                        }
                    }
                }
            } else if (node[0] === 'call' && node[1][0] === 'name' && node[1][1] === 'require' &&
                       ((node[2].length === 2 && node[2][1][0] === 'function') || node[2].length === 1) &&
                       node[2][0][0] === 'array') {
                var arrayNode = node[2][0];
                arrayNode[1].forEach(function (arrayItemAst) {
                    if (arrayItemAst[0] === 'string') {
                        var outgoingRelation = new relations.JavaScriptAmdRequire({
                            from: this,
                            callNode: node,
                            arrayNode: arrayNode,
                            node: arrayItemAst
                        });
                        outgoingRelation.to = {url: outgoingRelation.href};
                        outgoingRelations.push(outgoingRelation);
                    } else {
                        console.warn('Skipping non-string JavaScriptAmdRequire item: ' + uglify.uglify.gen_code(node));
                    }
                }, this);
            } else if (node[0] === 'call' && node[1][0] === 'name' && node[1][1] === 'define') {
                var arrayNode;
                if (node[2].length === 3 && node[2][0][0] === 'string' && node[2][1][0] === 'array') {
                    arrayNode = node[2][1];
                } else if (node[2].length === 2 && node[2][0][0] === 'array') {
                    arrayNode = node[2][0];
                }
                if (arrayNode) {
                    arrayNode[1].forEach(function (arrayItemAst) {
                        if (arrayItemAst[0] === 'string') {
                            var outgoingRelation = new relations.JavaScriptAmdDefine({
                                from: this,
                                callNode: node,
                                arrayNode: arrayNode,
                                node: arrayItemAst
                            });
                            outgoingRelation.to = {url: outgoingRelation.href};
                            outgoingRelations.push(outgoingRelation);
                        } else {
                            console.warn('Skipping non-string JavaScriptAmdDefine item: ' + uglify.uglify.gen_code(node));
                        }
                    }, this);
                }
            } else if (node[0] === 'call' && node[1][0] === 'name' && node[1][1] === 'require' &&
                       node[2].length === 1 && node[2][0][0] === 'string') {
                var baseUrl = this.nonInlineAncestor.url;
                if (/^file:/.test(baseUrl)) {
                    var Module = require('module'),
                        path = require('path'),
                        fileName = urlTools.fileUrlToFsPath(baseUrl),
                        fakeModule = new Module(fileName);
                    fakeModule.filename = fileName;
                    fakeModule.paths = Module._nodeModulePaths(path.dirname(fakeModule.fileName));
                    outgoingRelations.push(new relations.JavaScriptCommonJsRequire({
                        from: this,
                        to: {
                            url: urlTools.fsFilePathToFileUrl(Module._resolveFilename(node[2][0][1], fakeModule)[0])
                        },
                        node: node
                    }));
                } else {
                    console.warn('Skipping JavaScriptCommonJsRequire (only supported from file: urls): ' + uglify.uglify.gen_code(node));
                }
            }
        }

        if (errors.length) {
            throw new Error(_.pluck(errors, 'message').join("\n"));
        }
        return outgoingRelations;
    }
});

// Grrr...
JavaScript.prototype.__defineSetter__('text', Text.prototype.__lookupSetter__('text'));

JavaScript.mergeParseTrees = function (parseTrees) {
    return [
        'toplevel',
        Array.prototype.concat.apply([], parseTrees.map(function (parseTree) {
            return parseTree[1];
        }))
    ];
};

module.exports = JavaScript;

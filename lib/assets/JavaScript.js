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
                this.emit('serialize', this);
                this._text = uglify.uglify.gen_code(this._parseTree, {beautify: this.isPretty});
            } else {
                this._text = this._getTextFromRawSrc();
            }
        }
        return this._text;
    },

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
        this.markDirty();
    },

    get parseTree() {
        if (!this._parseTree) {
            var text = this.text;
            try {
                this._parseTree = uglify.parser.parse(text);
            } catch (e) {
                throw new Error("Parse error in " + (this.url || "inline script") + "\n" +
                                e.message + " (line " + e.line + ", col " + e.col + ")");
            }
        }
        return this._parseTree;
    },

    get outgoingRelations() {
        if (!this._outgoingRelations) {
            this._outgoingRelations = [];

            var stack = [],
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

            var traverse = function (node) {
                if (node[0] === 'call' && node[1][0] === 'dot' && node[1][1][0] === 'name' && node[1][1][1] === 'one') {
                    // one.<something>()
                    if (node[1][2] === 'include') {
                        if (node[2].length === 1 && node[2][0][0] === 'string') {
                            this._outgoingRelations.push(new relations.JavaScriptOneInclude({
                                from: this,
                                to: node[2][0][1],
                                node: stack[stack.length - 1]
                            }));
                        } else {
                            errors.push(new Error("Invalid one.include syntax: Must take a single string argument:" + uglify.uglify.gen_code(node)));
                        }
                    } else if (node[1][2] === 'getText') {
                        if (node[2].length === 1 && node[2][0][0] === 'string') {
                            this._outgoingRelations.push(new relations.JavaScriptOneGetText({
                                from: this,
                                to: node[2][0][1],
                                node: node,
                                parentNode: stack[stack.length - 1]
                            }));
                        } else {
                            errors.push(new Error("Invalid one.getText syntax: " + uglify.uglify.gen_code(node)));
                        }
                    } else if (node[1][2] === 'getStaticUrl') {
                        this._outgoingRelations.push(new relations.JavaScriptOneGetStaticUrl({
                            from: this,
                            node: node,
                            to: {
                                type: 'StaticUrlMap',
                                isResolved: true,
                                parseTree: deepCopy(node[2])
                            }
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
                                        this._outgoingRelations.push(new relations.JavaScriptExtJsRequire({
                                            from: this,
                                            to: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js', // Replace first . with : and the rest with /
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
                                    this._outgoingRelations.push(new relations.JavaScriptExtJsRequire({
                                        from: this,
                                        to: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js', // Replace first . with : and the rest with /
                                        extRequireStatParentNode: stack[stack.length - 1],
                                        extRequireStatNode: node,
                                        node: stringNode
                                    }));
                                }, this);
                            }
                        }
                    }
                }

                // Depth-first
                for (var i = 0 ; i < node.length ; i++) {
                    if (Array.isArray(node[i])) {
                        stack.push(node);
                        traverse(node[i]);
                        stack.pop();
                    }
                }
            }.bind(this);

            traverse(this.parseTree);

            if (errors.length) {
                throw new Error(_.pluck(errors, 'message').join("\n"));
            }
        }
        return this._outgoingRelations;
    },

    get isEmpty() {
        return this.parseTree[1].length === 0;
    },

    minify: function () {
        this.isPretty = false;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
    },

    prettyPrint: function () {
        this.isPretty = true;
        var parseTree = this.parseTree; // So markDirty removes this._text
        this.markDirty();
    }
});

JavaScript.mergeParseTrees = function (parseTrees) {
    return [
        'toplevel',
        Array.prototype.concat.apply([], parseTrees.map(function (parseTree) {
            return parseTree[1];
        }))
    ];
};

module.exports = JavaScript;

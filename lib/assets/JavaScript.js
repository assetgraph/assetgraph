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
        if (!this._text) {
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
                                node: node,
                                parentNode: stack[stack.length - 1],
                                parentParentNode: stack[stack.length - 2]
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

                        if (node[1][2].length < 2 || node[1][2][0][0] !== 'string' || node[1][2][1][0] !== 'object') {
                            // Skip unsupported Ext.define syntax, must be Ext.define(<string>, <object>)
                        } else {
                            node[1][2][1][1].forEach(function (keyValue) {
                                if (/^(?:mixins|requires|extend|uses)$/.test(keyValue[0])) {
                                    extractStringNodes(keyValue[1], 'Invalid Ext.define.' + keyValue[0] + ' syntax').forEach(function (stringNode) {
                                        this._outgoingRelations.push(new relations.JavaScriptExtJsRequire({
                                            from: this,
                                            to: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js', // Replace first . with : and the rest with /
                                            node: stringNode
                                        }));
                                    }, this);
                                }
                            }, this);
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
    },

    attachRelation: function (relation, position, adjacentRelation) {
        position = position || 'after';
        relation.from = this;
        if (adjacentRelation) {
            if (relation.type === 'JavaScriptOneInclude') {
                relation.parentParentNode = adjacentRelation.parentParentNode;
            } else {
                relation.parentNode = adjacentRelation.parentNode;
            }
        } else if (relation.type === 'JavaScriptOneInclude' && (position === 'first' || position === 'last')) {
            relation.parentParentNode = this.parseTree[1]; // Top level statements array
        }
        if (relation.type === 'JavaScriptOneGetStaticUrl') {
            throw new Error("Cannot attach a JavaScriptOneGetStaticUrl relation");
        }
        // FIXME: Clean this up!
        var node = relation.createNode(this.parseTree),
            parentNode = relation.parentNode;
        relation.node = node;
        if (relation.type === 'JavaScriptOneInclude') {
            relation.parentNode = ['stat', relation.node];
            node = relation.parentNode;
            parentNode = relation.parentParentNode;
        }
        if (position === 'before' || position === 'after') {
            var adjacentNode;
            if (relation.type === 'JavaScriptOneInclude') {
                adjacentNode = adjacentRelation.parentNode;
            } else {
                adjacentNode = adjacentRelation.node;
            }
            var i = parentNode.indexOf(adjacentNode) + (position === 'after' ? 1 : 0);
            parentNode.splice(i, 0, node);
        } else if (position === 'first') {
            parentNode.unshift(node);
        } else if (position === 'last') {
            parentNode.push(node);
        } else {
            throw new Error("assets.JavaScript.attachRelation: Unsupported 'position' value: " + position);
        }
        Text.prototype.attachRelation.call(this, relation, position, adjacentRelation);
    },

    detachRelation: function (relation) {
        if (relation.type === 'JavaScriptOneGetStaticUrl') {
            throw new Error("Cannot detach a JavaScriptOneGetStaticUrl relation, it is expression-level");
        } else if (relation.type === 'JavaScriptExtJsRequire') {
            if (relation.extRequireStatNode) {
                var parameters = relation.extRequireStatNode[1][2];
                if (parameters.length === 2 && parameters[0] === relation.node && parameters[1][0] === 'function') {
                    // Substitute Ext.require('Foo.Bar', function () {}) => Ext.require([], function (){})
                    // Must keep the array there, Ext.require(function () {}) doesn't work
                    parameters.splice(0, 1, ['array', []]);
                } else if (parameters.length === 1 && (parameters[0][0] === 'string' || parameters[0][0] === 'array' && parameters[0][0][1].length === 1)) {
                    // The only relation left (and no trailing function), remove the entire Ext.require statement
                    relation.extRequireStatParentNode.splice(relation.extRequireStatParentNode.indexOf(relation.extRequireStatNode), 1);
                } else if (parameters.length === 2 && parameters[1][0] === 'function' && parameters[0][0] === 'array') {
                    // Must keep the array there, Ext.require(function () {}) doesn't work
                    parameters[0][1].splice(parameters[0][1].indexOf(relation.node), 1);
                } else if (parameters.length > 2 && parameters.indexOf(relation.node) !== -1) {
                    parameters.splice(parameters.indexOf(relation.node, 1));
                }
                // Else give up, people shouldn't do Ext.require([...], [...], function (){}) anyway
            }
            // FIXME: Remove entries in Ext.define({requires: []}) (but keep all the others)
        } else {
            if (relation.type === 'JavaScriptOneInclude' && relation.parentNode[0] === 'stat') {
                var parentNodeIndex = relation.parentParentNode.indexOf(relation.parentNode);
                if (parentNodeIndex === -1) {
                    throw new Error("assets.JavaScript.detachRelation: JavaScriptOneInclude.parentNode not an element of .parentParentNode");
                }
                relation.parentParentNode.splice(parentNodeIndex, 1);
                delete relation.parentParentNode;
            } else {
                var nodeIndex = relation.parentNode.indexOf(relation.node);
                if (nodeIndex === -1) {
                    throw new Error("assets.JavaScript.detachRelation: relation.node not found in relation.parentNode");
                }
                relation.parentNode.splice(nodeIndex, 1);
            }
            delete relation.node;
            delete relation.parentNode;
        }

        Text.prototype.detachRelation.call(this, relation);
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

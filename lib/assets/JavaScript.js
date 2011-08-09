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
                        if (node.length >= 3 && node[2][0][0] === 'string') {
                            this._outgoingRelations.push(new relations.JavaScriptOneGetStaticUrl({
                                from: this,
                                to: node[2][0][1],
                                urlMap: new relations.JavaScriptOneGetStaticUrl.UrlMap({
                                    node: node,
                                    parentNode: stack[stack.length - 1],
                                    wildCardValueAsts: node[2].slice(1),
                                    originalUrl: node[2][0][1]
                                })
                            }));
                        } else if (node.length === 3 && node[2][0][0] === 'sub') {
                            // Result of JavaScriptOneGetStaticUrl.UrlMap.toExpressionAst
                            var urlMap = relations.JavaScriptOneGetStaticUrl.UrlMap.fromExpressionAst(node[2][0]);
                            urlMap.node = node;
                            urlMap.expandedUrls.forEach(function (expandedUrl) {
                                var mappedUrl = urlMap.expandedUrlMapping[expandedUrl] || expandedUrl;
                                this._outgoingRelations.push(new relations.JavaScriptOneGetStaticUrl({
                                    from: this,
                                    to: mappedUrl,
                                    originalUrl: expandedUrl,
                                    node: node,
                                    parentNode: stack[stack.length - 1],
                                    urlMap: urlMap
                                }));
                            }, this);
                        } else {
                            errors.push(new Error("Invalid one.getStaticUrl syntax: " + uglify.uglify.gen_code(node)));
                        }
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
                        //     extends: 'Foo.bar.Quux', // <-- implicit Ext.require
                        //     requires: ['Foo.bar.Blah'], // <-- implicit Ext.require
                        //     mixins: {
                        //         theName: 'Foo.Baz' // <-- implicit Ext.require
                        //     }
                        // })

                        var args = node[1][2];
                        if (args.length < 2 || args[0][0] !== 'string' || args[1][0] !== 'object') {
                            // Skip unsupported Ext.define syntax, must be Ext.define(<string>, <object>)
                        } else {
                            args[1][1].forEach(function (keyValue) {
                                if (/^(?:mixins|requires|extends|uses)$/.test(keyValue[0])) {
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
                        var args = node[1][2];
                        if (args.length === 0) {
                            errors.push(new Error('Invalid Ext.require syntax: Must have at least one argument'));
                        } else {
                            if (args[0][0] !== 'name') { // The Ext bootstrapper itself contains some Ext.syncRequire(h) statements
                                extractStringNodes(args[0], 'Invalid Ext.require syntax').forEach(function (stringNode) {
                                    this._outgoingRelations.push(new relations.JavaScriptExtJsRequire({
                                        from: this,
                                        to: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js', // Replace first . with : and the rest with /
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

    isEmpty: function () {
        return this.parseTree[1].length === 0;
    },

    minify: function () {
        this.isPretty = false;
        this.markDirty();
    },

    prettyPrint: function () {
        this.isPretty = true;
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
            relation.parentParentNode = this.parseTree[1];
        }
        if (relation.type === 'JavaScriptOneGetStaticUrl') {
            if (!adjacentRelation) {
                throw new Error("Cannot attach a JavaScriptOneGetStaticUrl relation without an adjacent relation");
            }
            relation.urlMap = adjacentRelation.urlMap;
            relation.originalUrl = urlTools.inferRelativeUrl(relation.urlMap.originalUrl, relation.to.url);
            relation.urlMap.addExpandedUrl(relation.originalUrl);
        } else {
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
        }
    },

    detachRelation: function (relation) {
        if (relation.type === 'JavaScriptOneGetStaticUrl') {
            if (relation.originalUrl) {
                relation.urlMap.removeExpandedUrl(relation.originalUrl);
            }
        } else if (relation.type === 'JavaScriptExtJsRequire') {
            throw new Error('assets.JavaScript.detachRelation: Detaching JavaScriptExtJsRequire relations not supported yet.');
        } else {
            if (relation.type === 'JavaScriptOneInclude' && relation.parentNode[0] === 'stat') {
                relation.parentParentNode.splice(relation.parentParentNode.indexOf(relation.parentNode), 1);
                delete relation.parentParentNode;
            } else {
                relation.parentNode.splice(relation.parentNode.indexOf(relation.node), 1);
            }
            delete relation.node;
            delete relation.parentNode;
        }
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

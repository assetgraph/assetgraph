var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify-js'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    relations = require('../relations'),
    Text = require('./Text'),
    deepCopy = require('../util/deepCopy'),
    urlTools = require('../util/urlTools');

function JavaScript(config) {
    Text.call(this, config);
}

util.inherits(JavaScript, Text);

_.extend(JavaScript.prototype, {
    contentType: 'application/javascript', // TODO: Double check that this is everyone's recommended value

    defaultExtension: '.js',

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(passError(cb, function (decodedSrc) {
            var parseTree;
            try {
                parseTree = uglify.parser.parse(decodedSrc);
            } catch (e) {
                return cb(new Error("Parse error in " + (that.url || "inline script") + "\n" +
                                    e.message + " (line " + e.line + ", col " + e.col + ")"));
            }
            cb(null, parseTree);
        }));
    }),

    isEmpty: function (cb) {
        this.getParseTree(passError(cb, function (parseTree) {
            cb(null, parseTree[1].length === 0);
        }));
    },

    minify: function (cb) {
        this.isPretty = false;
        process.nextTick(cb);
    },

    prettyPrint: function (cb) {
        this.isPretty = true;
        process.nextTick(cb);
    },

    getText: function (cb) {
        var that = this;
        that.getParseTree(passError(cb, function (parseTree) {
            cb(null, uglify.uglify.gen_code(parseTree, {beautify: that.isPretty}));
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(passError(cb, function (parseTree) {
            var stack = [],
                originalRelations = [],
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

            function traverse(node) {
                if (node[0] === 'call' && node[1][0] === 'dot' && node[1][1][0] === 'name' && node[1][1][1] === 'one') {
                    // one.<something>()
                    if (node[1][2] === 'include') {
                        if (node[2].length === 1 && node[2][0][0] === 'string' && stack[stack.length - 1][0] === 'stat') {
                            originalRelations.push(new relations.JavaScriptOneInclude({
                                from: that,
                                to: node[2][0][1],
                                node: stack[stack.length - 1],
                                parentNode: stack[stack.length - 2]
                            }));
                        } else {
                            errors.push(new Error("Invalid one.include syntax: Must be statement-level and takes a single string argument:" + uglify.uglify.gen_code(node)));
                        }
                    } else if (node[1][2] === 'getText') {
                        if (node[2].length === 1 && node[2][0][0] === 'string') {
                            originalRelations.push(new relations.JavaScriptOneGetText({
                                from: that,
                                to: node[2][0][1],
                                node: node,
                                parentNode: stack[stack.length - 1]
                            }));
                        } else {
                            errors.push(new Error("Invalid one.getText syntax: " + uglify.uglify.gen_code(node)));
                        }
                    } else if (node[1][2] === 'getStaticUrl') {
                        if (node.length >= 3 && node[2][0][0] === 'string') {
                            originalRelations.push(new relations.JavaScriptOneGetStaticUrl({
                                from: that,
                                to: node[2][0][1],
                                urlMap: new relations.JavaScriptOneGetStaticUrl.UrlMap({
                                    node: node,
                                    parentNode: stack[stack.length - 1],
                                    wildCardValueASTs: node[2].slice(1),
                                    originalUrl: node[2][0][1]
                                })
                            }));
                        } else if (node.length === 3 && node[2][0][0] === 'sub') {
                            // Result of JavaScriptOneGetStaticUrl.UrlMap.toExpressionAST
                            var urlMap = relations.JavaScriptOneGetStaticUrl.UrlMap.fromExpressionAST(node[2][0]);
                            urlMap.node = node;
                            urlMap.expandedUrls.forEach(function (expandedUrl) {
                                var mappedUrl = urlMap.expandedUrlMapping[expandedUrl] || expandedUrl;
                                originalRelations.push(new relations.JavaScriptOneGetStaticUrl({
                                    from: that,
                                    to: mappedUrl,
                                    originalUrl: expandedUrl,
                                    node: node,
                                    parentNode: stack[stack.length - 1],
                                    urlMap: urlMap
                                }));
                            });
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
                                if (/^(?:mixins|requires|extends)$/.test(keyValue[0])) {
                                    extractStringNodes(keyValue[1], 'Invalid Ext.define.' + keyValue[0] + ' syntax').forEach(function (stringNode) {
                                        originalRelations.push(new relations.JavaScriptExtJS4Include({
                                            from: that,
                                            to: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js', // Replace first . with : and the rest with /
                                            node: stringNode
                                        }));
                                    });
                                }
                            });
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
                                    originalRelations.push(new relations.JavaScriptExtJS4Include({
                                        from: that,
                                        to: stringNode[1].replace('.', ':').replace(/\./g, '/') + '.js', // Replace first . with : and the rest with /
                                        node: stringNode
                                    }));
                                });
                            }
                        }
                    }
                }

                for (var i = 0 ; i < node.length ; i++) {
                    if (Array.isArray(node[i])) {
                        stack.push(node);
                        traverse(node[i]);
                        stack.pop();
                    }
                }
            }
            traverse(parseTree);
            if (errors.length) {
                cb(new Error(_.pluck(errors, 'message').join("\n")));
            } else {
                cb(null, originalRelations);
            }
        }));
    }),

    attachRelation: function (relation, position, adjacentRelation) {
        position = position || 'after';
        relation.from = this;
        if (adjacentRelation) {
            relation.parentNode = adjacentRelation.parentNode;
        } else if (relation.type === 'JavaScriptOneInclude' && (position === 'first' || position === 'last')) {
            relation.parentNode = this.parseTree[1];
        }
        if (relation.type === 'JavaScriptOneGetStaticUrl') {
            if (!adjacentRelation) {
                throw new Error("Cannot attach a JavaScriptOneGetStaticUrl relation without an adjacent relation");
            }
            relation.urlMap = adjacentRelation.urlMap;
            relation.originalUrl = urlTools.inferRelativeUrl(relation.urlMap.originalUrl, relation.to.url);
            relation.urlMap.addExpandedUrl(relation.originalUrl);
        } else {
            relation.node = relation.createNode(this.parseTree);
            if (position === 'before' || position === 'after') {
                var i = relation.parentNode.indexOf(adjacentRelation.node) + (position === 'after' ? 1 : 0);
                relation.parentNode.splice(i, 0, relation.node);
            } else if (position === 'first') {
                relation.parentNode.unshift(relation.node);
            } else if (position === 'last') {
                relation.parentNode.push(relation.node);
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
        } else if (relation.type !== 'JavaScriptExtJS4Include') {
            relation.parentNode.splice(relation.parentNode.indexOf(relation.node), 1);
            delete relation.node;
            delete relation.parentNode;
        }
    }
});

JavaScript.mergeParseTrees = function (parseTrees, cb) {
    return [
        'toplevel',
        Array.prototype.concat.apply([], parseTrees.map(function (parseTree) {
            return parseTree[1];
        }))
    ];
};

module.exports = JavaScript;

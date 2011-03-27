/*global module, require*/
var util = require('util'),
    _ = require('underscore'),
    seq = require('seq'),
    uglify = require('uglify-js'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    relations = require('../relations'),
    UrlMap = require('../UrlMap'),
    Base = require('./Base').Base,
    deepCopy = require('../deepCopy'),
    fileUtils = require('../fileUtils');

function JavaScript(config) {
    Base.call(this, config);
}

util.inherits(JavaScript, Base);

_.extend(JavaScript.prototype, {
    contentType: 'application/javascript', // TODO: Double check that this is everyone's recommended value

    defaultExtension: 'js',

    isPretty: false,

    getParseTree: memoizeAsyncAccessor('parseTree', function (cb) {
        var that = this;
        this.getDecodedSrc(error.passToFunction(cb, function (decodedSrc) {
            cb(null, uglify.parser.parse(decodedSrc));
        }));
    }),

    minify: function (cb) {
        this.isPretty = false;
        this.isMinified = true;
        process.nextTick(cb);
    },

    prettyPrint: function (cb) {
        this.isPretty = true;
        process.nextTick(cb);
    },

    getText: function (cb) {
        var that = this;
        that.getParseTree(error.passToFunction(cb, function (parseTree) {
            if (that.isMinified) {
                parseTree = uglify.uglify.ast_squeeze(uglify.uglify.ast_mangle(parseTree), {no_warnings: true});
            }
            cb(null, uglify.uglify.gen_code(parseTree, that.isPretty));
        }));
    },

    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            cb = error.onlyCallOnce(cb);

            var stack = [],
                originalRelations = [];

            function traverse(node) {
                if (node[0] === 'stat' && Array.isArray(node[1]) &&
                    node[1][0] === 'call' && Array.isArray(node[1][1]) && node[1][1][0] === 'dot' &&
                    Array.isArray(node[1][1][1]) && node[1][1][1][0] === 'name' && node[1][1][1][1] === 'one') {

                    if (/^(?:lazyInlude|include)$/.test(node[1][1][2])) {
                        if (Array.isArray(node[1][2]) && node[1][2].length === 1 &&
                            Array.isArray(node[1][2][0]) && node[1][2][0][0] === 'string') {

                            originalRelations.push(new relations['JavaScript' + (node[1][1][2] === 'include' ? 'Static' : 'Lazy') + 'Include']({
                                from: that,
                                node: node,
                                parentNode: stack[stack.length - 1],
                                to: node[1][2][0][1]
                            }));
                        } else {
                            return cb(new Error("Invalid one.include syntax"));
                        }
                    }
                } else if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'dot' &&
                           Array.isArray(node[1][1]) && node[1][1][0] === 'name' && node[1][1][1] === 'one' &&
                           node[1][2] === 'getStaticUrl') {

                    if (node.length >= 3 && Array.isArray(node[2]) && Array.isArray(node[2][0]) &&
                        node[2][0][0] === 'string') {
                        originalRelations.push(new relations.JavaScriptStaticUrl({
                            from: that,
                            urlMap: new UrlMap({
                                parentNode: stack[stack.length - 1],
                                node: node,
                                wildCardValueAsts: node[2].slice(1),
                                originalUrl: node[2][0][1]
                            }),
                            to: node[2][0][1]
                        }));
                    } else if (node.length === 3 && Array.isArray(node[2]) && Array.isArray(node[2][0]) && node[2][0][0] === 'sub') {
                        // Result of UrlMap.toExpressionAst
                        var urlMap = UrlMap.fromExpressionAst(node[2][0]);
                        urlMap.getReachableUrls().forEach(function (reachableUrl) {
                            originalRelations.push(new relations.JavaScriptStaticUrl({
                                from: that,
                                to: reachableUrl,
                                parentNode: stack[stack.length - 1],
                                node: node,
                                urlMap: urlMap
                            }));
                        });
                    } else {
                        return cb(new Error("Invalid one.getStaticUrl syntax: " + uglify.uglify.gen_code(node)));
                    }
                } else if (node[0] === 'if' && node[1][0] === 'dot' &&
                           node[1][1][0] === 'name' && node[1][1][1] === 'one') {
                    originalRelations.push(new relations.JavaScriptConditionalBlock({
                        from: that,
                        parentNode: stack[stack.length - 1],
                        node: node,
                        environment: node[1][2],
                        to: {
                            type: 'JavaScript',
                            rawSrc: true, // FIXME
                            parseTree: ['toplevel', [deepCopy(node[2])]]
                        }
                    }));
                }

                for (var i=0 ; i < node.length ; i++) {
                    if (Array.isArray(node[i])) {
                        stack.push(node);
                        traverse(node[i]);
                        stack.pop();
                    }
                }
            }
            traverse(parseTree);
            cb(null, originalRelations);
        }));
    }),

    attachRelation: function (relation, position, adjacentRelation) {
        position = position || 'after';
        _.extend(relation, {
            from: this,
            parentNode: adjacentRelation.parentNode
        });
        if (relation.type === 'JavaScriptStaticUrl') {
            if (!adjacentRelation) {
                throw new Error("Cannot attach a JavaScriptStaticUrl relation without an adjacent relation");
            }
            relation.urlMap = adjacentRelation.urlMap;
            relation.originalUrl = fileUtils.inferRelativeUrl(relation.urlMap.originalUrl, relation.to.url);
            relation.urlMap.addExpandedUrl(relation.originalUrl);
        } else {
            relation.node = relation.createNode(this.parseTree);
            var i = relation.parentNode.indexOf(adjacentRelation.node) + (position === 'after' ? 1 : 0);
            relation.parentNode.splice(i, 0, relation.node);
        }
    },

    detachRelation: function (relation) {
        if (relation.type === 'JavaScriptStaticUrl') {
            relation.urlMap.removeExpandedUrl(relation.originalUrl);
        } else {
            relation.parentNode.splice(relation.parentNode.indexOf(relation.node), 1);
            delete relation.node;
            delete relation.parentNode;
        }
    }
});

JavaScript.makeBundle = function (javaScripts, cb) {
    seq.ap(javaScripts).
        // Set a concurrency limit of 200 to avoid running out of file descriptors
        parMap(200, function (javaScript) {
            javaScript.getParseTree(this);
        })
        ['catch'](cb).
        seq(function () {
            cb(null, new JavaScript({
                parseTree: [
                    'toplevel',
                    [].concat.apply([], this.stack.map(function (parseTree) {
                        return deepCopy(parseTree[1]);
                    }))
                ]
            }));
        });
};

exports.JavaScript = JavaScript;

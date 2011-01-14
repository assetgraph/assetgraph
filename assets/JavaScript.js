/*global module, require*/
var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    relations = require('../relations'),
    Base = require('./Base').Base;

function JavaScript(config) {
    Base.call(this, config);
}

util.inherits(JavaScript, Base);

_.extend(JavaScript.prototype, {
    getParseTree: makeBufferedAccessor('parseTree', function (cb) {
        var that = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            that.parseTree = uglify.parser.parse(src);
            cb(null, that.parseTree);
        }));
    }),

    getOriginalRelations: makeBufferedAccessor('originalRelations', function (cb) {
        var that = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var callbackCalled = false;
            // Avoid calling the callback more than once
            function finished(err, relations) {
                if (!callbackCalled) {
                    cb(err, relations);
                    callbackCalled = true;
                }
            }
            var stack = [],
                originalRelations = [];

            function walk(node) {
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
                                assetConfig: {
                                    url: node[1][2][0][1]
                                }
                            }));
                        } else {
                            finished(new Error("Invalid one.include syntax"));
                        }
                    }
/*
                    else if (node[1][2] === 'getStaticUrl') {
                        if (Array.isArray(node[2]) && node[2].length === 1 &&
                            Array.isArray(node[2][0]) && node[2][0][0] === 'string') {

                            originalRelations.push(new relations.JavaScriptStaticUrl({
                                from: that,
                                parentNode: stack[stack.length - 1],
                                node: node,
                                assetConfig: {
                                    url: node[2][1]
                                }
                            }));
                        } else {
                            finished(new Error("Invalid one.getStaticUrl syntax"));
                        }
                    }
*/
                }

                for (var i=0 ; i<node.length ; i++) {
                    if (Array.isArray(node[i])) {
                        stack.push(node);
                        walk(node[i]);
                        stack.pop();
                    }
                }
            }
            walk(parseTree);
            finished(null, originalRelations);
        }));
    }),

    attachRelation: function (relation, position, adjacentRelation) {
        position = position || 'after';
        var parentNode = adjacentRelation.parentNode;
        _.extend(relation, {
            from: this,
            parentNode: parentNode,
            node: relation.createNode(this.parseTree)
        });
        var i = parentNode.indexOf(adjacentRelation.node) + (position === 'after' ? 1 : 0);
        parentNode.splice(i, 0, relation.node);
    },

    detachRelation: function (relation) {
        relation.parentNode.splice(relation.parentNode.indexOf(relation.node), 1);
        delete relation.node;
        delete relation.parentNode;
    }
});

exports.JavaScript = JavaScript;

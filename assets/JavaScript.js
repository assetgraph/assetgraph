/*global module, require*/
var util = require('util'),
    _ = require('underscore'),
    uglify = require('uglify'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    Base = require('./Base');

var JavaScript = module.exports = function (config) {
    Base.call(this, config);
};

util.inherits(JavaScript, Base);

_.extend(JavaScript.prototype, {
    getParseTree: makeBufferedAccessor('parseTree', function (cb) {
        var This = this;
        this.getSrc(error.passToFunction(cb, function (src) {
            This.parseTree = uglify.parser.parse(src);
            cb(null, This.parseTree);
        }));
    }),

    getPointers: makeBufferedAccessor('pointers', function (cb) {
        var This = this;
        this.getParseTree(error.passToFunction(cb, function (parseTree) {
            var pointers = {};
            function addPointer(pointer) {
                pointer.includingAsset = This;
                (pointers[pointer.type] = pointers[pointer.type] || []).push(pointer);
            }

            function walk (node) {
                if (node[0] === 'call' && Array.isArray(node[1]) && node[1][0] === 'dot' &&
                    Array.isArray(node[1][1]) && node[1][1][0] === 'name' && node[1][1][1] === 'one') {
                    if (/^(?:lazyInlude|include)$/.test(node[1][2])) {
                        if (Array.isArray(node[2]) && node[2].length === 1 &&
                            Array.isArray(node[2][0]) && node[2][0][0] === 'string') {
                            addPointer({
                                type: node[1][2] === 'include' ? 'js-static-include' : 'js-lazy-include',
                                baseUrl: This.baseUrlForPointers,
                                url: node[2][0][1],
                                node: node
                            });
                        } else {
                            throw new Error("Invalid one.include syntax");
                        }
                    } else if (node[1][2] === 'getStaticUrl') {
                        if (Array.isArray(node[2]) && node[2].length === 1 &&
                            Array.isArray(node[2][0]) && node[2][0][0] === 'string') {

                            addPointer({
                                type: 'js-static-url',
                                baseUrl: This.baseUrlForPointers,
                                url: node[2][1],
                                node: node
                            });
                        } else {
                            throw new Error("Invalid one.getStaticUrl syntax");
                        }
                    }
                }

                for (var i=1 ; i<node.length ; i++) {
                    if (Array.isArray(node[i])) {
                        walk(node[i]);
                    }
                }
            }
            walk(parseTree);
            cb(null, pointers);
        }));
    })
});

/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    nextId = 1;

function Base(config) {
    _.extend(this, config);
    this.id = nextId;
    nextId += 1;
}

Base.prototype = {
    isAsset: true, // Avoid instanceof check in AssetGraph.addAsset

    encoding: 'utf8', // Change to 'binary' in subclass for images etc.

    getOriginalSrc: memoizeAsyncAccessor('originalSrc', function (cb) {
        if (this.originalSrcProxy) {
            this.originalSrcProxy(cb);
        } else {
            cb(new Error("Don't know how to get the original asset src: " + this.toString()));
        }
    }),

    // Overwrite in subclass if an intermediate representation/parse tree is used for manipulation:
    serialize: function (cb) {
        this.getOriginalSrc(cb);
    },

    // Override in subclass if it supports relations:
    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        process.nextTick(function () {
            cb(null, []);
        });
    }),

    toString: function () {
        return "[" + this.type + "/" + this.id + "]";
    }
};

exports.Base = Base;

/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    makeBufferedAccessor = require('../makeBufferedAccessor'),
    nextId = 1;

function Base(config) {
    _.extend(this, config);
    this.id = nextId;
    nextId += 1;
}

Base.prototype = {
    encoding: 'utf8', // Change to 'binary' in subclass for images etc.

    getOriginalSrc: makeBufferedAccessor('originalSrc', function (cb) {
        if (this.originalSrcProxy) {
            this.originalSrcProxy(cb);
        } else {
            cb(new Error("Don't know how to get the original asset src!"));
        }
    }),

    // Override in subclass if it supports relations
    getOriginalRelations: makeBufferedAccessor('originalRelations', function (cb) {
        process.nextTick(function () {
            cb(null, []);
        });
    }),

    toString: function () {
        return "[" + this.type + "/" + this.id + "]";
    }
};

exports.Base = Base;

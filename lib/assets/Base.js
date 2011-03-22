/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../error'),
    uniqueId = require('../uniqueId'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    iconv = require('iconv');

function Base(config) {
    _.extend(this, config);
    this.id = uniqueId.nextId;
    uniqueId.nextId += 1;
}

Base.prototype = {
    isAsset: true, // Avoid instanceof checks

    encoding: 'utf-8', // Change to null in subclass for images etc.

    getRawSrc: memoizeAsyncAccessor('rawSrc', function (cb) {
        if (this.rawSrcProxy) {
            this.rawSrcProxy(cb);
        } else {
            cb(new Error("Don't know how to get the original asset src: " + this.toString()));
        }
    }),

    getDecodedSrc: memoizeAsyncAccessor('decodedSrc', function (cb) {
        var that = this;
        if (that.encoding === null) {
            return cb(new Error("getDecodedSrc: encoding is null"));
        }
        that.getRawSrc(error.passToFunction(cb, function (rawSrc) {
            if (/^utf-?8$/.test(that.encoding)) {
                cb(null, rawSrc.toString('utf-8'));
            } else {
                cb(null, new iconv.Iconv(that.encoding, 'utf-8').toString('utf-8'));
            }
        }));
    }),

    // Overwrite in subclass if an intermediate representation/parse tree is used for manipulation:
    serialize: function (cb) {
        this.getRawSrc(cb);
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

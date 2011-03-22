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

    getEncoding: function (cb) {
        var that = this;
        process.nextTick(function () {
            if (that.encoding === null) {
                return cb(new Error("getEncoding: encoding is null"));
            }
            cb(null, that.encoding);
        });
    },

    getRawSrc: memoizeAsyncAccessor('rawSrc', function (cb) {
        if (this.rawSrcProxy) {
            this.rawSrcProxy(cb);
        } else {
            cb(new Error("Don't know how to get the original asset src: " + this.toString()));
        }
    }),

    getDecodedSrc: memoizeAsyncAccessor('decodedSrc', function (cb) {
        var that = this;
        that.getRawSrc(error.passToFunction(cb, function (rawSrc) {
            that.getEncoding(error.passToFunction(cb, function (encoding) {
                if (/^utf-?8$/.test(encoding)) {
                    cb(null, rawSrc.toString('utf-8'));
                } else {
                    cb(null, new iconv.Iconv(encoding, 'utf-8').convert(rawSrc).toString('utf-8'));
                }
            }));
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

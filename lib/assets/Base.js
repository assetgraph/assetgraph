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

    defaultEncoding: 'utf-8', // Change to null in subclass for images etc.

    getOriginalEncoding: function (cb) {
        var that = this;
        process.nextTick(function () {
            cb(null, that.originalEncoding || that.defaultEncoding);
        });
    },

    // Side effect: Sets the 'originalEncoding' property if the proxy provides it in the metadata (eg. from HTTP headers)
    getRawSrc: memoizeAsyncAccessor('rawSrc', function (cb) {
        var that = this;
        if (that.rawSrcProxy) {
            that.rawSrcProxy(error.passToFunction(cb, function (rawSrc, metadata) {
                if (metadata && metadata.originalEncoding) {
                    that.originalEncoding = metadata.originalEncoding;
                }
                cb(null, rawSrc);
            }));
        } else {
            cb(new Error("Don't know how to get the raw asset src: " + that.toString()));
        }
    }),

    hasRawSrc: function () {
        return 'rawSrcProxy' in this || 'rawSrc' in this;
    },

    // Only applies to text-based assets (maybe create assets.Text subclass?)
    getDecodedSrc: memoizeAsyncAccessor('decodedSrc', function (cb) {
        var that = this;
        that.getRawSrc(error.passToFunction(cb, function (rawSrc) {
            that.getOriginalEncoding(error.passToFunction(cb, function (originalEncoding) {
                if (/^utf-?8$/i.test(originalEncoding)) {
                    cb(null, rawSrc.toString('utf-8'));
                } else {
                    cb(null, new iconv.Iconv(originalEncoding, 'utf-8').convert(rawSrc).toString('utf-8'));
                }
            }));
        }));
    }),

    // Implement a getText method in subclass if an intermediate representation/parse tree is used for manipulation.
    serialize: function (cb) {
        var that = this;
        that.getOriginalEncoding(function (err, originalEncoding) {
            var mustGetText;
            if (err) {
                if (that.decodedSrc) {
                    // Might be an inline asset that never existing in raw form
                    mustGetText = true;
                } else {
                    return cb(err);
                }
            }
            if (mustGetText || that.isDirty) {
                // TODO: Take manipulatable non-text assets into account somehow.
                that.getText(error.passToFunction(cb, function (text) {
                    var targetEncoding = that.targetEncoding || originalEncoding || that.defaultEncoding;
                    if (/^utf-?8$/i.test(targetEncoding)) {
                        cb(null, new Buffer(text));
                    } else {
                        cb(null, new iconv.Iconv('utf-8', targetEncoding).convert(text));
                    }
                }));
            } else {
                that.getRawSrc(error.passToFunction(cb, function (rawSrc) {
                    if (!that.targetEncoding || that.targetEncoding === encoding) {
                        cb(null, rawSrc);
                    } else {
                        cb(null, new iconv.Iconv(originalEncoding, that.targetEncoding).convert(rawSrc));
                    }
                }));
            }
        });
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

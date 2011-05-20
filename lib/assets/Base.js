/*global module, require*/
var path = require('path'),
    _ = require('underscore'),
    error = require('../util/error'),
    uniqueId = require('../uniqueId'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor');

function Base(config) {
    _.extend(this, config);
    this.id = uniqueId();
}

Base.prototype = {
    isAsset: true, // Avoid instanceof checks

    contentType: 'application/octet-stream',

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

    // Override in subclass if it supports relations:
    getOriginalRelations: memoizeAsyncAccessor('originalRelations', function (cb) {
        process.nextTick(function () {
            cb(null, []);
        });
    }),

    // Override in subclass if an intermediate representation is used or the asset can be manipulated:
    getSerializedSrc: function (cb) {
        this.getRawSrc(cb);
    },

    _clone: function (cb) {
        var that = this;
        that.getSerializedSrc(error.passToFunction(cb, function (src) {
            cb(null, new that.constructor({
                rawSrc: src
            }));
        }));
    },

    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    }
};

module.exports = Base;

/*global module, require*/
var Path = require('path'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    uniqueId = require('../util/uniqueId'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor');

function Base(config) {
    _.extend(this, config);
    this.id = uniqueId();
    if (this.url && !/\/(?:[?#].*)?$/.test(this.url)) {
        this.originalExtension = Path.extname(this.url.replace(/[?#].*$/, ''));
    }
}

Base.prototype = {
    isAsset: true, // Avoid instanceof checks

    contentType: 'application/octet-stream',

    defaultExtension: '',

    getExtension: function () {
        if (this.url && !/\/(?:[?#].*)?$/.test(this.url)) {
            return Path.extname(this.url.replace(/[?#].*$/, ''));
        } else if ('originalExtension' in this) {
            return this.originalExtension;
        } else {
            return this.defaultExtension;
        }
    },

    // Side effect: Sets the 'originalEncoding' property if the proxy provides it in the metadata (eg. from HTTP headers)
    getRawSrc: memoizeAsyncAccessor('rawSrc', function (cb) {
        var that = this;
        if (that.rawSrcProxy) {
            that.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
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

    _clone: function (cb) {
        var that = this;
        that.getRawSrc(passError(cb, function (rawSrc) {
            cb(null, new that.constructor({
                rawSrc: rawSrc
            }));
        }));
    },

    markDirty: function () {
        this.isDirty = true;
        delete this.rawSrc;
        delete this.serializedSize; // Yuck, try to get rid of this
    },

    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    }
};

module.exports = Base;

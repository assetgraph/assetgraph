/*global module, require*/
var Path = require('path'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    uniqueId = require('../util/uniqueId'),
    urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;

function Base(config) {
    if (config.rawSrc) {
        this._rawSrc = config.rawSrc;
        delete config.rawSrc;
    }
    _.extend(this, config);
    this.id = uniqueId();
    if (this.url && !urlEndsWithSlashRegExp.test(this.url)) {
        this.originalExtension = Path.extname(this.url.replace(/[?#].*$/, ''));
    }
}

Base.prototype = {
    isAsset: true, // Avoid instanceof checks

    contentType: 'application/octet-stream',

    defaultExtension: '',

    // Side effect: Sets the '_metadata' property if the proxy provides it
    load: function (cb) {
        var that = this;
        if (that._rawSrc) {
            process.nextTick(cb);
        } else if (that.rawSrcProxy) {
            that.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
                that._rawSrc = rawSrc;
                if (metadata) {
                    that._metadata = metadata;
                }
                cb();
            }));
        } else {
            process.nextTick(function () {
                cb(new Error("assets.Base.load: No rawSrc or rawSrcProxy found, cannot load"));
            });
        }
    },

    get extension() {
        if (this.url && !urlEndsWithSlashRegExp.test(this.url)) {
            return Path.extname(this.url.replace(/[?#].*$/, ''));
        } else if ('originalExtension' in this) {
            return this.originalExtension;
        } else {
            return this.defaultExtension;
        }
    },

    get rawSrc() {
        if (!this._rawSrc) {
            throw new Error("assets.Base.rawSrc getter: Asset isn't loaded");
        }
        return this._rawSrc;
    },

    set rawSrc(rawSrc) {
        this._rawSrc = rawSrc;
        this.markDirty();
    },

    // Override in subclass if it supports relations:
    getRelations: function () {
        return [];
    },

    _clone: function () {
        return new this.constructor({
            rawSrc: this.rawSrc
        });
    },

    markDirty: function () {
        this.isDirty = true;
        delete this._rawSrc;
    },

    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    }
};

module.exports = Base;

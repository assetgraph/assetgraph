/*global module, require*/
var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    uniqueId = require('../util/uniqueId'),
    urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;

function Base(config) {
    EventEmitter.call(this);
    if (config.rawSrc) {
        this._rawSrc = config.rawSrc;
        delete config.rawSrc;
    }
    if (config.url) {
        this._url = config.url;
        delete config.url;
    }
    _.extend(this, config);
    this.id = uniqueId();
    if (this.url && !urlEndsWithSlashRegExp.test(this.url)) {
        this.originalExtension = path.extname(this.url.replace(/[?#].*$/, ''));
    }
}

util.inherits(Base, EventEmitter);

extendWithGettersAndSetters(Base.prototype, {
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
            return path.extname(this.url.replace(/[?#].*$/, ''));
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

    get url() {
        return this._url;
    },

    set url(url) {
        var oldUrl = this._url;
        this._url = url;
        this.emit('setUrl', this, url, oldUrl);
    },

    markDirty: function () {
        this.isDirty = true;
        delete this._rawSrc;
    },

    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    },

    // Override in subclass if it supports relations:
    getRelations: function () {
        return [];
    },

    _clone: function () {
        return new this.constructor({
            rawSrc: this.rawSrc
        });
    }
});

module.exports = Base;

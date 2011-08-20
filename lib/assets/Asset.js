/*global module, require*/
var EventEmitter = require('events').EventEmitter,
    path = require('path'),
    util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    passError = require('../util/passError'),
    uniqueId = require('../util/uniqueId'),
    urlEndsWithSlashRegExp = /\/(?:[?#].*)?$/;

function Asset(config) {
    EventEmitter.call(this);
    if (config.rawSrc) {
        this._rawSrc = config.rawSrc;
        delete config.rawSrc;
    }
    if (config.parseTree) {
        this._parseTree = config.parseTree;
        delete config.parseTree;
    }
    if (config.url) {
        this._url = config.url;
        delete config.url;
    }
    if (config.outgoingRelations) {
        this._outgoingRelations = config.outgoingRelations;
        delete config.outgoingRelations;
    }
    _.extend(this, config);
    this.id = uniqueId();
    if (this.url && !urlEndsWithSlashRegExp.test(this.url)) {
        this.originalExtension = path.extname(this.url.replace(/[?#].*$/, ''));
    }
}

util.inherits(Asset, EventEmitter);

extendWithGettersAndSetters(Asset.prototype, {
    isAsset: true, // Avoid instanceof checks

    contentType: 'application/octet-stream',

    defaultExtension: '',

    load: function (cb) {
        var that = this;
        if (that._rawSrc || that._parseTree) {
            process.nextTick(cb);
        } else if (that.rawSrcProxy) {
            that.rawSrcProxy(passError(cb, function (rawSrc, metadata) {
                that._rawSrc = rawSrc;
                if (metadata) {
                    _.extend(this, metadata); // Might change url, contentType and encoding
                }
                delete that.rawSrcProxy;
                cb();
            }));
        } else {
            process.nextTick(function () {
                cb(new Error("assets.Asset.load: No rawSrc or rawSrcProxy found, cannot load"));
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
            throw new Error("assets.Asset.rawSrc getter: Asset isn't loaded");
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

    get isInline() {
        return !this.url;
    },

    markDirty: function () {
        this.isDirty = true;
        delete this._rawSrc;
        this.emit('dirty', this);
    },

    toString: function () {
        return "[" + this.type + "/" + this.id + (this.url ? " " + this.url : "") + "]";
    },

    // Override in subclass if it supports relations:
    get outgoingRelations() {
        if (!this._outgoingRelations) {
            this._outgoingRelations = [];
        }
        return this._outgoingRelations;
    },

    _clone: function () {
        return new this.constructor({
            rawSrc: this.rawSrc
        });
    }
});

module.exports = Asset;

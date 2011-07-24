var util = require('util'),
    _ = require('underscore'),
    iconv = require('iconv'),
    passError = require('../util/passError'),
    memoizeAsyncAccessor = require('../util/memoizeAsyncAccessor'),
    Base = require('./Base');

// Superclass for text-based assets that need support for different encodings.
function Text(config) {
    Base.call(this, config);
}

util.inherits(Text, Base);

_.extend(Text.prototype, {
    isText: true,

    defaultEncoding: 'utf-8',

    defaultExtension: '.txt',

    alternateExtensions: ['.xtemplate'], // For Ext.XTemplate + one.getText

    contentType: 'text/plain',

    getOriginalEncoding: function (cb) {
        var that = this;
        process.nextTick(function () {
            cb(null, that.originalEncoding || that.defaultEncoding);
        });
    },

    getTargetEncoding: function (cb) {
        if (this.targetEncoding) {
            var targetEncoding = this.targetEncoding;
            process.nextTick(function () {
                cb(null, targetEncoding);
            });
        } else {
            this.getOriginalEncoding(cb);
        }
    },

    setTargetEncoding: function (encoding) {
        if (encoding !== this.targetEncoding) {
            this.targetEncoding = encoding;
            asset.markDirty();
        }
    },

    getText: memoizeAsyncAccessor('text', function (cb) {
        var that = this;
        that.getRawSrc(passError(cb, function (rawSrc) {
            that.getOriginalEncoding(passError(cb, function (originalEncoding) {
                if (/^utf-?8$/i.test(originalEncoding)) {
                    cb(null, rawSrc.toString('utf-8'));
                } else {
                    cb(null, new iconv.Iconv(originalEncoding, 'utf-8').convert(rawSrc).toString('utf-8'));
                }
            }));
        }));
    }),

    getRawSrc: function (cb) {
        var that = this;
        that.getOriginalEncoding(function (err, originalEncoding) {
            if (err && !that.text) {
                return cb(err);
            }
            // Else assume it's an inline asset or that it never existed in "raw form"
            if ('text' in that || 'parseTree' in that || that.isDirty || !that.hasRawSrc()) {
                that.getText(passError(cb, function (text) {
                    var targetEncoding = that.targetEncoding || originalEncoding || that.defaultEncoding;
                    if (/^utf-?8$/i.test(targetEncoding)) {
                        cb(null, new Buffer(text));
                    } else {
                        cb(null, new iconv.Iconv('utf-8', targetEncoding).convert(text));
                    }
                }));
            } else {
                Base.prototype.getRawSrc.call(that, passError(cb, function (rawSrc) {
                    if (!that.targetEncoding || that.targetEncoding === encoding) {
                        cb(null, rawSrc);
                    } else {
                        that.rawSrc = new iconv.Iconv(originalEncoding, that.targetEncoding).convert(rawSrc);
                        cb(null, that.rawSrc);
                    }
                }));
            }
        });
    },

    markDirty: function () {
        if ('parseTree' in this) {
            delete this.text;
        }
        Base.prototype.markDirty.call(this);
    },

    // More efficient than Base._clone for text-based assets:
    _clone: function (cb) {
        var that = this;
        that.getText(passError(cb, function (text) {
            cb(null, new that.constructor({
                targetEncoding: that.targetEncoding,
                text: text
            }));
        }));
    }
});

module.exports = Text;

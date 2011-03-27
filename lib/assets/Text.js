var util = require('util'),
    _ = require('underscore'),
    iconv = require('iconv'),
    error = require('../error'),
    memoizeAsyncAccessor = require('../memoizeAsyncAccessor'),
    Base = require('./Base').Base;

// Superclass for text-based assets that need support for different encodings.
function Text(config) {
    Base.call(this, config);
}

util.inherits(Text, Base);

_.extend(Text.prototype, {
    defaultEncoding: 'utf-8', // Change to null in subclass for images etc.

    getOriginalEncoding: function (cb) {
        var that = this;
        process.nextTick(function () {
            cb(null, that.originalEncoding || that.defaultEncoding);
        });
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
    getSerializedSrc: memoizeAsyncAccessor('serializedSrc', function (cb) {
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
    })
});

exports.Text = Text;

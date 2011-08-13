var util = require('util'),
    _ = require('underscore'),
    iconv = require('iconv'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    passError = require('../util/passError'),
    Base = require('./Base');

// Superclass for text-based assets that need support for different encodings.
function Text(config) {
    if (config.text) {
        this._text = config.text;
        delete config.text;
    }
    if (config.encoding) {
        this._encoding = config.encoding;
        delete config.encoding;
    }
    Base.call(this, config);
}

util.inherits(Text, Base);

extendWithGettersAndSetters(Text.prototype, {
    isText: true,

    defaultEncoding: 'utf-8',

    defaultExtension: '.txt',

    alternateExtensions: ['.xtemplate'], // For Ext.XTemplate + one.getText

    contentType: 'text/plain',

    load: function (cb) {
        if (this._text || this._parseTree) {
            process.nextTick(cb);
        } else {
            Base.prototype.load.call(this, cb);
        }
    },

    get encoding() {
        if (!this._encoding) {
            this._encoding = this.defaultEncoding;
        }
        return this._encoding;
    },

    set encoding(encoding) {
        if (encoding !== this.encoding) {
            var text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
            delete this._rawSrc;
            this._encoding = encoding;
            this.markDirty();
        }
    },

    get rawSrc() {
        if (!this._rawSrc) {
            if (this._text || this._parseTree) {
                if (/^utf-?8$/i.test(this.encoding)) {
                    this._rawSrc = new Buffer(this.text);
                } else {
                    this._rawSrc = new iconv.Iconv('utf-8', this.encoding).convert(this.text);
                }
            } else {
                throw new Error("assets.Text.rawSrc getter: No _rawSrc or _text property found, asset not loaded?");
            }
        }
        return this._rawSrc;
    },

    set rawSrc(rawSrc) {
        this._rawSrc = rawSrc;
        delete this._parseTree;
        delete this._text;
        this.markDirty();
    },

    get text() {
        if (!this._text) {
            this._text = this._getTextFromRawSrc();
        }
        return this._text;
    },

    set text(text) {
        this._text = text;
        delete this._rawSrc;
        delete this._parseTree;
        this.markDirty();
    },

    markDirty: function () {
        if (this._parseTree) {
            delete this._text;
        }
        Base.prototype.markDirty.call(this);
    },

    _getTextFromRawSrc: function () {
        if (!this._rawSrc) {
            throw new Error("assets.Text._getTextFromRawSrc(): No _rawSrc property found.");
        }
        if (/^utf-?8$/i.test(this.encoding)) {
            return this._rawSrc.toString('utf-8');
        } else {
            return new iconv.Iconv(this.encoding, 'utf-8').convert(this._rawSrc).toString('utf-8');
        }
    },

    // More efficient than Base._clone for text-based assets:
    _clone: function () {
        return new this.constructor({
            encoding: this.encoding,
            text: this.text
        });
    }
});

module.exports = Text;

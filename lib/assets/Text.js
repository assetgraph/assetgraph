const Asset = require('./Asset');
let iconv;
let iconvLite;

try {
  iconv = require('iconv');
} catch (e) {
  try {
    iconvLite = require('iconv-lite');
  } catch (e2) {}
}

/**
 * Adds text encoding and decoding support to {@link Asset}. Serves as a
 * superclass for {@link Html}, {@link Xml}, {@link Css}, {@link JavaScript},
 * {@link Json}, and {@link CacheManifest}.
 *
 * In addition to the [config]{@link AssetConfig} already supported by the Asset base
 * class, the options `text` and `encoding` are also available
 *
 * @example
 *     var textAsset = new Text({
 *         // "æøå" in iso-8859-1:
 *         rawSrc: Buffer.from([0xe6, 0xf8, 0xe5]),
 *         encoding: "iso-8859-1"
 *     });
 *     textAsset.text; // "æøå" (decoded JavaScript string)
 *     textAsset.encoding = 'utf-8';
 *     textAsset.rawSrc; // <Buffer c3 a6 c3 b8 c3 a5>
 *
 * @class Text
 * @extends Asset
 * @param {AssetConfig} config The Text assets configuration
 *
 * @param {String} [config.text] The decoded source of the asset. Can be used
 * instead of `rawSrc` and `rawSrcProxy`.
 *
 * @param {String} [config.encoding="utf-8"] Used to decode and reencode the {@link Asset#rawSrc}.
 * Can be any encoding supported by the `iconv` module. Can be changed later
 * using {@link Text#encoding}. See the docs for {@link Text#defaultEncoding}.
 * If the asset is loaded via http, the encoding will be read from the `Content-Type`,
 * and likewise for `data:` urls.
 *
 * @param {AssetGraph} assetGraph Mandatory AssetGraph instance references
 */
class Text extends Asset {
  /**
   * Get or set the encoding (charset) used for re-encoding the raw
   * source of the asset. To affect the initial decoding of the
   * `rawSrc` option, provide the `encoding` option to the
   * constructor.
   *
   * @type {String}
   */
  get encoding() {
    if (!this._encoding) {
      this._encoding = this.defaultEncoding;
    }
    return this._encoding;
  }

  set encoding(encoding) {
    if (encoding !== this.encoding) {
      /*eslint-disable*/
      const text = this.text; // Make sure this._text exists so the rawSrc is decoded before the original encoding is thrown away
      /*eslint-enable*/
      this._rawSrc = undefined;
      this._encoding = encoding;
      this.markDirty();
    }
  }

  get rawSrc() {
    if (!this._rawSrc) {
      let error;

      if (typeof this._text === 'string' || this._parseTree) {
        if (/^utf-?8$/i.test(this.encoding)) {
          this._updateRawSrcAndLastKnownByteLength(
            Buffer.from(this.text, 'utf-8')
          );
        } else if (/^(?:us-?)?ascii$/i.test(this.encoding)) {
          this._updateRawSrcAndLastKnownByteLength(
            Buffer.from(this.text, 'ascii')
          );
        } else if (iconv) {
          try {
            this._updateRawSrcAndLastKnownByteLength(
              new iconv.Iconv('utf-8', this.encoding).convert(this.text)
            );
          } catch (err) {
            err.message = `iconv: Converting ${this.url} from UTF-8 to ${
              this.encoding
            } failed:\n${err.message}`;
            if (this.assetGraph) {
              if (err.code === 'EILSEQ') {
                err.message +=
                  '\nTransliterating and ignoring further failures. Data corruption may occur.';
                this._updateRawSrcAndLastKnownByteLength(
                  new iconv.Iconv(
                    'utf-8',
                    `${this.encoding}//TRANSLIT//IGNORE`
                  ).convert(this.text)
                );
              }
              this.assetGraph.warn(err);
            } else {
              throw err;
            }
          }
        } else if (iconvLite) {
          try {
            this._updateRawSrcAndLastKnownByteLength(
              iconvLite.encode(this.text, this.encoding)
            );
          } catch (err) {
            err.message = `iconv: Converting ${this.url} from UTF-8 to ${
              this.encoding
            } failed:\n${err.message}`;
            if (this.assetGraph) {
              this.assetGraph.warn(err);
            } else {
              throw err;
            }
          }
        } else {
          error = new Error(
            `iconv and iconv-lite not found. Cannot encode ${this} as ${
              this.encoding
            }. ` +
              `Please run \`npm install iconv\` or \`npm install iconv-lite\` and try again`
          );
          error.asset = this;
          throw error;
        }
      } else {
        error = new Error(
          'Text.rawSrc getter: No _rawSrc or _text property found, asset not loaded?'
        );
        error.asset = this;

        throw error;
      }
    }
    return this._rawSrc;
  }

  set rawSrc(rawSrc) {
    this.unload();
    this._parseTree = undefined;
    this._text = undefined;
    this._updateRawSrcAndLastKnownByteLength(rawSrc);
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  /**
   * Get or set the decoded text contents of the of the asset as a
   * JavaScript string. Unlike browsers AssetGraph doesn't try to
   * sniff the charset of your text-based assets. It will fall back
   * to assuming utf-8 if it's unable to determine the
   * encoding/charset from HTTP headers, `<meta
   * http-equiv='Content-Type'>` tags ({@link Html}), `@charset` ({@link Css}), so
   * if for some reason you're not using utf-8 for all your
   * text-based assets, make sure to provide those hints. Other
   * asset types provide no standard way to specify the charset
   * within the file itself, so presently there's no way to load
   * eg. JavaScript from disc if it's not utf-8 or ASCII, except by
   * overriding `Text.prototype.defaultEncoding` globally.
   *
   * If the internal state has been changed since the asset was
   * initialized, it will automatically be reserialized when the
   * `text` property is retrieved, for example:
   *
   *     var htmlAsset = new Html({
   *         rawSrc: Buffer.from("<body>hello</body>");
   *     });
   *     htmlAsset.text; // "<body>hello</body>"
   *     htmlAsset.parseTree.body.innerHTML = "bye";
   *     htmlAsset.markDirty();
   *     htmlAsset.text; // "<body>bye</body>"
   *
   * Setting this property after the outgoing relations have been
   * accessed currently leads to undefined behavior.
   *
   * @type {String}
   */
  get text() {
    if (typeof this._text !== 'string') {
      this._text = this._getTextFromRawSrc();
    }
    return this._text;
  }

  set text(text) {
    this.unload();
    this._text = text;
    this._lastKnownByteLength = undefined;
    if (this.assetGraph) {
      this.populate();
    }
    this.markDirty();
  }

  markDirty() {
    if (this._parseTree) {
      this._text = undefined;
      this._sourceMap = undefined;
    }
    super.markDirty();
  }

  _getTextFromRawSrc() {
    if (!this.isLoaded) {
      throw new Error(
        `Text._getTextFromRawSrc(): Asset not loaded: ${this.urlOrDescription}`
      );
    }
    if (!this._rawSrc) {
      throw new Error(
        `Text._getTextFromRawSrc(): No _rawSrc property found: ${
          this.urlOrDescription
        }`
      );
    }
    if (/^utf-?8$/i.test(this.encoding)) {
      return this._rawSrc.toString('utf-8');
    } else if (/^(?:us-?)?ascii$/i.test(this.encoding)) {
      return this._rawSrc.toString('ascii');
    } else if (iconv) {
      return new iconv.Iconv(this.encoding, 'utf-8')
        .convert(this._rawSrc)
        .toString('utf-8');
    } else if (iconvLite) {
      return iconvLite.decode(this._rawSrc, this.encoding);
    } else {
      const error = new Error(
        `iconv and iconv-lite not found. Cannot decode ${this} (encoding is ${
          this.encoding
        }). ` +
          `Please run \`npm install iconv\` or \`npm install iconv-lite\` and try again`
      );
      error.asset = this;

      throw error;
    }
  }
}

Object.assign(Text.prototype, {
  /**
   * Property that's true for all Text instances. Avoids reliance on
   * the `instanceof` operator.
   *
   * @member Text#isText
   * @type {Boolean}
   * @default true
   */
  isText: true,

  /**
   * The default encoding for the Text (sub)class. Used for decoding
   * the raw source when the encoding cannot be determined by other
   * means, such as a `Content-Type` header (when the asset was
   * fetched via http), or another indicator specific to the given
   * asset type (`@charset` for Css, `<meta
   * http-equiv="Content-Type" ...>` for Html).
   *
   * Factory setting is "utf-8", but you can override it by setting
   * `Text.prototype.defaultEncoding` to another value supported by
   * the `iconv` of `iconv-lite` modules.
   *
   * @member Text#defaultEncoding
   * @type {String}
   * @default "utf-8"
   */
  defaultEncoding: 'utf-8',

  supportedExtensions: [
    '.txt',
    '.htaccess',
    '.md',
    '.rst',
    '.ics',
    '.csv',
    '.tsv',
    '.xtemplate' // For Ext.XTemplate + GETTEXT
  ],

  contentType: 'text/plain'
});

module.exports = Text;

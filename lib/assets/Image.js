const Asset = require('./Asset');

const dprMatcher = /(?:@(\d+(?:[.,]\d+)?)x)?$/;

class Image extends Asset {
  init(config) {
    super.init(config);

    if (this._fileName) {
      const dpr = this._fileName
        .replace(this._extension, '')
        .match(dprMatcher)[1];

      if (dpr) {
        this.devicePixelRatio = dpr;
      }
    }
  }

  get defaultDevicePixelRatio() {
    return 1;
  }

  get devicePixelRatio() {
    if (typeof this._devicePixelRatio !== 'undefined') {
      return this._devicePixelRatio;
    } else {
      return this.defaultDevicePixelRatio;
    }
  }

  set devicePixelRatio(ratio) {
    if (!/^\d+(?:[.,]\d+)?$/.test(ratio.toString())) {
      throw new Error(
        'Image device pixel ratio: May only contain digits, comma and dot'
      );
    }

    ratio = Number(ratio.toString().replace(',', '.'));

    if (ratio <= 0) {
      throw new Error('Image device pixel ratio: Must be a larger than 0');
    }

    if (ratio === Infinity) {
      throw new Error('Image device pixel ratio: Cannot be infinite');
    }

    this._devicePixelRatio = ratio;
  }

  get fileName() {
    return super.fileName;
  }

  set fileName(fileName) {
    const dpr = fileName.replace(this._extension, '').match(dprMatcher)[1];

    if (dpr) {
      this.devicePixelRatio = dpr;
    }

    super.fileName = fileName;
  }

  get url() {
    return super.url;
  }

  set url(url) {
    super.url = url;

    const dpr = this._fileName
      .replace(this._extension, '')
      .match(dprMatcher)[1];

    if (dpr) {
      this.devicePixelRatio = dpr;
    }
  }
}

Object.assign(Image.prototype, {
  /**
   * Property that's true for all Image instances. Avoids reliance on
   * the `instanceof` operator and enables you to query for all
   * image types:
   *
   *     var imageAssets = assetGraph.findAssets({isImage: true});
   *
   * @static
   * @type {Boolean}
   * @memberOf Image#
   */
  isImage: true,

  notDefaultForContentType: true, // Avoid reregistering application/octet-stream

  defaultEncoding: null
});

module.exports = Image;

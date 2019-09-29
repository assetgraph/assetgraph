const Relation = require('../Relation');

class ApplicationManifestUrl extends Relation {
  get href() {
    return this.hrefScope[this.hrefProperty];
  }

  set href(href) {
    this.hrefScope[this.hrefProperty] = href;
  }

  inline() {
    throw new Error('ApplicationManifestUrl.inline(): Not supported.');
  }

  attach() {
    throw new Error('ApplicationManifestUrl.attach(): Not supported.');
  }

  detach() {
    throw new Error('ApplicationManifestUrl.detach(): Not supported.');
  }
}

module.exports = ApplicationManifestUrl;

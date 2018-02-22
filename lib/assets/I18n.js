const canonicalizeObject = require('../canonicalizeObject');
const Json = require('./Json');

class I18n extends Json {
  prettyPrint() {
    super.prettyPrint();
    this._parseTree = canonicalizeObject(this._parseTree, 2);
  }
}

Object.assign(I18n.prototype, {
  notDefaultForContentType: true, // Avoid reregistering application/json

  supportedExtensions: ['.i18n']
});

module.exports = I18n;

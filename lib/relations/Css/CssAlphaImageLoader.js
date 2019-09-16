const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssAlphaImageLoader extends CssUrlTokenRelation {
  createUrlToken(href) {
    // Quote if necessary:
    return `src='${href.replace(/(['"])/g, '\\$1')}'`;
  }

  detach() {
    this.node.removeChild(this.propertyNode);
    return super.detach();
  }
}

Object.assign(CssAlphaImageLoader.prototype, {
  // Singlequoted url must come first, then doublequoted url
  tokenRegExp: /\bsrc=(?:'((?:[^']|\\')*)'|"((?:[^"]|\\")*)")/g
});

module.exports = CssAlphaImageLoader;

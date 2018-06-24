const Relation = require('./Relation');

class CssUrlTokenRelation extends Relation {
  constructor(config) {
    super(config);
    this.tokenNumber = this.tokenNumber || 0;
  }

  findUrlsInPropertyValue(propertyValue) {
    const urls = [];
    let matchUrlToken;
    this.tokenRegExp.lastIndex = 0; // Just in case
    while ((matchUrlToken = this.tokenRegExp.exec(propertyValue))) {
      let url;
      if (typeof matchUrlToken[1] === 'string') {
        // singlequoted url
        url = matchUrlToken[1].replace(/\\/g, '');
      } else if (typeof matchUrlToken[2] === 'string') {
        // doublequoted url
        url = matchUrlToken[2].replace(/\\/g, '');
      } else {
        // unquoted url
        url = matchUrlToken[3].replace(/\\/g, '');
      }
      urls.push(url);
    }
    return urls;
  }

  createUrlToken(href) {
    // Quote if necessary:
    if (/^[a-z0-9/\-_.]*$/i.test(href)) {
      return `url(${href})`;
    } else {
      return `url('${href.replace(/(['"])/g, '\\$1')}')`;
    }
  }

  get href() {
    // undefined if not found
    return this.findUrlsInPropertyValue(this.propertyNode.value)[
      this.tokenNumber
    ];
  }

  set href(href) {
    const cssUrlToken = this.createUrlToken(href);
    let tokenNumber = 0;
    this.propertyNode.value = this.propertyNode.value.replace(
      this.tokenRegExp,
      $0 => {
        tokenNumber += 1;
        if (tokenNumber - 1 === this.tokenNumber) {
          return cssUrlToken;
        } else {
          return $0;
        }
      }
    );
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('Not implemented');
  }

  detach() {
    const value = this.propertyNode.value;
    const matchToken = value && value.match(this.tokenRegExp);
    if (matchToken) {
      if (value === matchToken[0]) {
        this.node.removeChild(this.propertyNode);
      } else {
        // FIXME: Leaves an extraneous space char in some edge cases:
        let tokenNumber = 0;
        this.propertyNode.value = value
          .replace(this.tokenRegExp, $0 => {
            tokenNumber += 1;
            if (tokenNumber - 1 === this.tokenNumber) {
              return '';
            } else {
              return $0;
            }
          })
          .trim();
      }
    }
    this.node = undefined;
    this.propertyNode = undefined;
    this.parentNode = undefined;
    return super.detach();
  }
}

Object.assign(CssUrlTokenRelation.prototype, {
  // If a subclass decides to overwrite this, the order of the captures is significant.
  // Singlequoted url must come first, then (optionally) doublequoted url, then (optionally) unquoted url
  tokenRegExp: /\burl\(\s*(?:'((?:[^']|\\')*)'|"((?:[^"]|\\")*)"|(([^'"\\]|\\.)*?)\s*)\)/g
});

module.exports = CssUrlTokenRelation;

const Relation = require('./Relation');

class JsonUrl extends Relation {
  get href() {
    return this.hrefScope[this.hrefProperty];
  }

  set href(href) {
    this.hrefScope[this.hrefProperty] = href;
  }

  inline() {
    throw new Error('JsonUrl.inline(): Not supported.');
  }

  attach() {
    throw new Error('JsonUrl.attach(): Not supported.');
  }

  detach() {
    throw new Error('JsonUrl.detach(): Not supported.');
  }
}

module.exports = JsonUrl;

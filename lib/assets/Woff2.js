const Font = require('./Font');

class Woff2 extends Font {}

Object.assign(Woff2.prototype, {
  contentType: 'font/woff2',

  supportedExtensions: ['.woff2']
});

module.exports = Woff2;

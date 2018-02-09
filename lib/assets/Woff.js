const Font = require('./Font');

class Woff extends Font {}

Object.assign(Woff.prototype, {
  contentType: 'font/woff',

  supportedExtensions: ['.woff']
});

module.exports = Woff;

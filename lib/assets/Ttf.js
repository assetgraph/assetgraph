const Font = require('./Font');

class Ttf extends Font {}

Object.assign(Ttf.prototype, {
  contentType: 'font/ttf',

  supportedExtensions: ['.ttf']
});

module.exports = Ttf;

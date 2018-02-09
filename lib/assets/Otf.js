const Font = require('./Font');

class Otf extends Font {}

Object.assign(Otf.prototype, {
  contentType: 'font/otf',

  supportedExtensions: ['.otf']
});

module.exports = Otf;

const Font = require('./Font');

class Eot extends Font {}

Object.assign(Eot.prototype, {
  contentType: 'application/vnd.ms-fontobject',

  supportedExtensions: ['.eot']
});

module.exports = Eot;

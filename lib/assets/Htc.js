const Html = require('./Html');

class Htc extends Html {}

Object.assign(Htc.prototype, {
  contentType: 'text/x-component',

  supportedExtensions: ['.htc']
});

module.exports = Htc;

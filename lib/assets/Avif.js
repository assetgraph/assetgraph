const Image = require('./Image');

class Avif extends Image {}

Object.assign(Avif.prototype, {
  contentType: 'image/avif',

  supportedExtensions: ['.avif'],
});

module.exports = Avif;

const Image = require('./Image');

class Webp extends Image {}

Object.assign(Webp.prototype, {
  contentType: 'image/webp',

  supportedExtensions: ['.webp']
});

module.exports = Webp;

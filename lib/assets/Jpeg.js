const Image = require('./Image');

class Jpeg extends Image {}

Object.assign(Jpeg.prototype, {
  contentType: 'image/jpeg',

  supportedExtensions: ['.jpg', '.jpeg']
});

module.exports = Jpeg;

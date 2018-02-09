const Image = require('./Image');

class Png extends Image {}

Object.assign(Png.prototype, {
  contentType: 'image/png',

  supportedExtensions: ['.png']
});

module.exports = Png;

const Image = require('./Image');

class Gif extends Image {}

Object.assign(Gif.prototype, {
  contentType: 'image/gif',

  supportedExtensions: ['.gif']
});

module.exports = Gif;

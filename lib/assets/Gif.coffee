Image = require './Image'

class Gif extends Image
  contentType: 'image/gif'
  supportedExtensions: ['.gif']

module.exports = Gif

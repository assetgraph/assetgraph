Image = require './Image'

class Jpeg extends Image
  contentType: 'image/jpeg'
  supportedExtensions: ['.jpg', '.jpeg']

module.exports = Jpeg

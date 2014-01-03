Image = require './Image'

class Png extends Image
  contentType: 'image/png'
  supportedExtensions: ['.png']

module.exports = Png

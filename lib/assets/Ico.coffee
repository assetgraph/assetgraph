Image = require './Image'

class Ico extends Image
  contentType: 'image/x-icon' # Non-standard, but supported by IE
  supportedExtensions: ['.ico']

module.exports = Ico

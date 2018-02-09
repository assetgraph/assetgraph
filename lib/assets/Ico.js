const Image = require('./Image');

class Ico extends Image {}

Object.assign(Ico.prototype, {
  contentType: 'image/x-icon', // Non-standard, but supported by IE

  supportedExtensions: ['.ico']
});

module.exports = Ico;

const Asset = require('./Asset');

class Flash extends Asset {}

Object.assign(Flash.prototype, {
  contentType: 'application/x-shockwave-flash',

  supportedExtensions: ['.swf']
});

module.exports = Flash;

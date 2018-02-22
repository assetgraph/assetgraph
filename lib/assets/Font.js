const Asset = require('./Asset');

class Font extends Asset {}

Object.assign(Font.prototype, {
  isFont: true,

  notDefaultForContentType: true, // Avoid reregistering application/octet-stream

  defaultEncoding: null
});

module.exports = Font;

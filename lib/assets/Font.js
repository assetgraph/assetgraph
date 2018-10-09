const Asset = require('./Asset');

class Font extends Asset {}

const formatMap = {
  '.woff': 'woff',
  '.woff2': 'woff2',
  '.ttf': 'truetype',
  '.svg': 'svg',
  '.eot': 'embedded-opentype'
};

Object.assign(Font.prototype, {
  isFont: true,

  notDefaultForContentType: true, // Avoid reregistering application/octet-stream

  defaultEncoding: null,

  get format() {
    return formatMap[this.extension];
  }
});

module.exports = Font;

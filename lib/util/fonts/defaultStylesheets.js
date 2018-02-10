const pathModule = require('path');
const fs = require('fs');

module.exports = [
  {
    predicates: {},
    text: fs.readFileSync(
      pathModule.resolve(__dirname, 'chromium-default-stylesheet.css'),
      'utf-8'
    )
  },
  {
    predicates: { 'browser:firefox': true },
    text: fs.readFileSync(
      pathModule.resolve(__dirname, 'firefox-default-stylesheet.css'),
      'utf-8'
    )
  }
];

var fs = require('fs');

module.exports = [
  {
    predicates: {},
    text: fs.readFileSync(
      __dirname + '/chromium-default-stylesheet.css',
      'utf-8'
    )
  },
  {
    predicates: { 'browser:firefox': true },
    text: fs.readFileSync(
      __dirname + '/firefox-default-stylesheet.css',
      'utf-8'
    )
  }
];

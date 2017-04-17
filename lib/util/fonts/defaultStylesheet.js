var fs = require('fs');
var defaultStylesheet = fs.readFileSync(__dirname + '/chromium-default-stylesheet.css', 'utf-8');

module.exports = defaultStylesheet;

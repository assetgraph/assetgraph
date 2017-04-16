var fs = require('fs');
var postcss = require('postcss');
var defaultStylesheet = fs.readFileSync(__dirname + '/chromium-default-stylesheet.css', 'utf-8');

var ast = postcss.parse(defaultStylesheet);

module.exports = ast;

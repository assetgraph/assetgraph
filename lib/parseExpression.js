const espree = require('espree');

module.exports = function parseExpression(str) {
  return espree.parse(`(${String(str)})`, {
    sourceType: 'module',
    jsx: true
  }).body[0].expression;
};

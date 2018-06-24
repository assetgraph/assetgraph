const esprima = require('esprima');

module.exports = function parseExpression(str) {
  return esprima.parse(`(${String(str)})`, {
    sourceType: 'module',
    jsx: true
  }).body[0].expression;
};

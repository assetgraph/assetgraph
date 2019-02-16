const espree = require('espree-papandreou');

module.exports = function parseExpression(str) {
  return espree.parse(`(${String(str)})`, {
    sourceType: 'module',
    jsx: true
  }).body[0].expression;
};

const parseJavaScript = require('./parseJavaScript');

module.exports = function parseExpression(str) {
  return parseJavaScript(`(${String(str)})`, {
    sourceType: 'module',
    ecmaVersion: 2021,
  }).body[0].expression;
};

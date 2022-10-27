const parseJavaScript = require('./parseJavaScript');

module.exports = function parseExpression(str) {
  return parseJavaScript(`(${String(str)})`, {
    sourceType: 'module',
    ecmaVersion: 'latest',
  }).body[0].expression;
};

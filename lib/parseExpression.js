const parseJavaScript = require('./parseJavaScript');

module.exports = function parseExpression(str) {
  return parseJavaScript(`(${String(str)})`, {
    sourceType: 'module'
  }).body[0].expression;
};

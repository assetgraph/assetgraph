const parseJavaScript = require('./parseJavaScript');

/**
 * @param {string} str
 */
module.exports = function parseExpression(str) {
  return parseJavaScript(`(${String(str)})`, {
    sourceType: 'module'
  }).body[0].expression;
};

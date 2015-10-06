var esprima = require('esprima');

module.exports = function parseExpression(str) {
    return esprima.parse('(' + String(str) + ')').body[0].expression;
};

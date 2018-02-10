const pseudoClassRegExp = require('./cssPseudoClassRegExp');
const pseudoElementRegExp = require('./cssPseudoElementRegExp');

module.exports = function stripDynamicPseudoClasses(selector) {
  return selector
    .replace(pseudoClassRegExp, '')
    .replace(pseudoElementRegExp, '');
};

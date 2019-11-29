const pseudoClassRegExp = require('./cssPseudoClassRegExp');
const pseudoElementRegExp = require('./cssPseudoElementRegExp');

/**
 * @param {string} selector
 * @returns {string}
 */
module.exports = function stripDynamicPseudoClasses(selector) {
  return selector
    .replace(pseudoClassRegExp, '')
    .replace(pseudoElementRegExp, '');
};

const cssPseudoClassRegExp = require('../cssPseudoClassRegExp');
const multiPseudoClassMatcher = new RegExp(
  `(?:${cssPseudoClassRegExp.source})+`,
  'gi'
);
const cssCombinators = [' ', '>', '+', '~', '/'];

function stripPseudoClassesFromSelector(str) {
  return str.replace(multiPseudoClassMatcher, (match, offset) => {
    if (offset === 0) {
      return '*';
    }

    if (cssCombinators.includes(str.charAt(offset - 1))) {
      return '*';
    }

    return '';
  });
}

module.exports = stripPseudoClassesFromSelector;

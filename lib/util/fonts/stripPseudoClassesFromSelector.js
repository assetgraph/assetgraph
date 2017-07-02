var cssPseudoClassRegExp = require('../cssPseudoClassRegExp');
var multiPseudoClassMatcher = new RegExp('(?:' + cssPseudoClassRegExp.source + ')+', 'gi');
var cssCombinators = [' ', '>', '+', '~', '/'];

function stripPseudoClassesFromSelector(str) {
    return str.replace(multiPseudoClassMatcher, function (match, offset) {
        if (offset === 0) {
            return '*';
        }

        if (cssCombinators.indexOf(str.charAt(offset - 1)) !== -1) {
            return '*';
        }

        return '';
    });
}

module.exports = stripPseudoClassesFromSelector;

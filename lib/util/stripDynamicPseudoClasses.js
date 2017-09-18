var pseudoClassRegExp = require('./cssPseudoClassRegExp');
var pseudoElementRegExp = require('./cssPseudoElementRegExp');

module.exports = function stripDynamicPseudoClasses(selector) {
    return selector
        .replace(pseudoClassRegExp, '')
        .replace(pseudoElementRegExp, '');
};

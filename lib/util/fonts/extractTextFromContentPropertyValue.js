var unescapeCssString = require('./unescapeCssString');
var charactersByListStyleType = require('./charactersByListStyleType');

function extractQuotes(quotes, token) {
    if (!quotes || quotes === 'none') {
        return '';
    }
    var text = '';
    var num = 0;
    // Tokenize the quotes attribute into quoted strings, eg.: '>>' '<<'
    quotes.replace(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g, function ($0, doubleQuotedString, singleQuotedString) {
        if ((token === 'open-quote' && num % 2 === 0) || (token === 'close-quote' && num % 2 === 1)) {
            if (typeof doubleQuotedString === 'string') {
                text += unescapeCssString(doubleQuotedString);
            } else {
                // typeof singleQuotedString === 'string'
                text += unescapeCssString(singleQuotedString);
            }
        }
        num += 1;
    });
    return text;
}

function tokenizeContent(content) {
    var tokens = [];
    // <content-list> = [ <string> | contents | <image> | <quote> | <target> | <leader()> ]+
    (content || 'normal').replace(/(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|counter\(\s*[a-z0-9-]+\s*,\s*([a-z0-9-]+)\s*\)|([^'"]+)/g, function ($0, url, doubleQuotedString, singleQuotedString, counterStyle, other) {
        if (typeof doubleQuotedString === 'string') {
            tokens.push({ type: 'string', value: unescapeCssString(doubleQuotedString) });
        } else if (typeof singleQuotedString === 'string') {
            tokens.push({ type: 'string', value: unescapeCssString(singleQuotedString) });
        } else if (url) {
            tokens.push({ type: 'url', value: url });
        } else if (counterStyle) {
            tokens.push({ type: 'counter', value: counterStyle });
        } else {
            other = other.trim();
            if (other === 'open-quote' || other === 'close-quote') {
                tokens.push({ type: other });
            } else if (other === 'normal' || other === 'none') {
                tokens.push({ type: other });
            } else {
                var matchAttr = other.trim().match(/^attr\(([\w-]+)\)$/);
                if (matchAttr) {
                    tokens.push({ type: 'attr', value: matchAttr[1] });
                } else {
                    // throw new Error('Cannot parse token: ' + other);
                    tokens.push({ type: 'string', value: other });
                }
            }
        }
    });
    return tokens;
}

function expandContent(tokens, node, quotes, hypotheticalCounterStyleByName) {
    var text = '';
    tokens.forEach(function (token) {
        if (token.type === 'string') {
            text += token.value;
        } else if (token.type === 'counter') {
            if (charactersByListStyleType[token.value]) {
                text += charactersByListStyleType[token.value];
            } else if (hypotheticalCounterStyleByName[token.value]) {
                text += hypotheticalCounterStyleByName[token.value].value;
            } else {
                // Warn: Undefined counter style?
            }
        } else if (token.type === 'open-quote' || token.type === 'close-quote') {
            text += extractQuotes(quotes, token.type);
        } else if (token.type === 'attr') {
            text += node.getAttribute(token.value) || '';
        }
    });
    return text;
}

function expandHypotheticalCounterStylePermutations(hypotheticalCounterStyleValuesByName, referencedCounterStyleNames) {
    var permutations = [];
    var firstPropertyName = referencedCounterStyleNames[0];
    var firstPropertyValues = hypotheticalCounterStyleValuesByName[referencedCounterStyleNames[0]];

    for (var i = 0 ; i < Math.max(1, firstPropertyValues.length) ; i += 1) {
        if (referencedCounterStyleNames.length > 1) {
            expandHypotheticalCounterStylePermutations(hypotheticalCounterStyleValuesByName, referencedCounterStyleNames.slice(1)).forEach(function (permutation) {
                permutation[firstPropertyName] = firstPropertyValues[i];
                permutations.push(permutation);
            });
        } else {
            var permutation = {};
            permutation[firstPropertyName] = firstPropertyValues[i];
            permutations.push(permutation);
        }
    }

    return permutations;
}

function extractTextFromContentPropertyValue(value, node, hypotheticalQuotesValues, hypotheticalCounterStyleValuesByName) {
    var tokens = tokenizeContent(value);
    var isSeenByCounterStyle = {};
    tokens.forEach(function (token) {
        if (token.type === 'counter' && !charactersByListStyleType[token.value]) {
            isSeenByCounterStyle[token.value] = true;
        }
    });
    var usesQuotes = tokens.some(function (token) {
        return token.type === 'open-quote' || token.type === 'close-quote';
    });
    function expandCounterStyles(quotes) {
        var referencedCounterStyleNames = Object.keys(isSeenByCounterStyle);
        if (referencedCounterStyleNames.length > 0) {
            var result = [];
            expandHypotheticalCounterStylePermutations(referencedCounterStyleNames).forEach(function (hypotheticalCounterStyleByName) {
                var content = expandContent(tokens, node, quotes, hypotheticalCounterStyleByName);
                if (content) {
                    result.push({
                        value: content,
                        truePredicates: hypotheticalCounterStyleByName.reduce(function (acc, counterStyleName) {
                            return Object.assign(acc, hypotheticalCounterStyleByName[counterStyleName].truePredicates);
                        }, {}),
                        falsePredicates: hypotheticalCounterStyleByName.reduce(function (acc, counterStyleName) {
                            return Object.assign(acc, hypotheticalCounterStyleByName[counterStyleName].falsePredicates);
                        }, {})
                    });
                }
            });
            return result;
        } else {
            return [{ value: expandContent(tokens, node, quotes), falsePredicates: {}, truePredicates: {}}];
        }
    }

    if (usesQuotes) {
        var result = [];
        hypotheticalQuotesValues.forEach(function (hypotheticalQuotesValue) {
            var expandedContentValues = expandCounterStyles(hypotheticalQuotesValue.value);
            expandedContentValues.forEach(function (value) {
                Object.assign(value.falsePredicates, hypotheticalQuotesValue.falsePredicates);
                Object.assign(value.truePredicates, hypotheticalQuotesValue.truePredicates);
            });
            Array.prototype.push.apply(result, expandedContentValues);
        });
        return result;
    } else {
        return expandCounterStyles();
    }
}

module.exports = extractTextFromContentPropertyValue;

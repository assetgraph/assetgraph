var unescapeCssString = require('./unescapeCssString');
var counterRendererByListStyleType = require('./counterRendererByListStyleType');
var getCounterCharacters = require('./getCounterCharacters');
var expandPermutations = require('../expandPermutations');

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
    (content || 'normal').replace(/(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|counter\(\s*([a-z0-9-]+)\s*,\s*([a-zA-Z0-9-]+)\s*\)|counters\(\s*([a-z0-9-]+)\s*,\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*(?:,\s*([a-zA-Z0-9-]+)\s*)?\)|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'"]+)/g, function ($0, url, counterName, counterStyle, countersCounterName, doubleQuotedCountersSeparator, singleQuotedCountersSeparator, countersCounterStyle, doubleQuotedString, singleQuotedString, other) {
        if (typeof doubleQuotedString === 'string') {
            tokens.push({ type: 'string', value: unescapeCssString(doubleQuotedString) });
        } else if (typeof singleQuotedString === 'string') {
            tokens.push({ type: 'string', value: unescapeCssString(singleQuotedString) });
        } else if (url) {
            tokens.push({ type: 'url', value: url });
        } else if (counterStyle) {
            tokens.push({ type: 'counter', name: counterName, value: counterStyle });
        } else if (typeof doubleQuotedCountersSeparator === 'string') {
            tokens.push({ type: 'counters', separator: unescapeCssString(doubleQuotedCountersSeparator), value: countersCounterStyle || 'decimal', name: countersCounterName });
        } else if (typeof singleQuotedCountersSeparator === 'string') {
            tokens.push({ type: 'counters', separator: unescapeCssString(singleQuotedCountersSeparator), value: countersCounterStyle || 'decimal', name: countersCounterName });
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

function expandContent(tokens, node, quotes, hypotheticalCounterStyleByName, possibleCounterValuesByName) {
    var text = '';
    tokens.forEach(function (token) {
        if (token.type === 'string') {
            text += token.value;
        } else if (token.type === 'counter' || token.type === 'counters') {
            if (counterRendererByListStyleType[token.value]) {
                text += (possibleCounterValuesByName[token.name] || [0])
                    .map(counterValue => counterRendererByListStyleType[token.value](counterValue))
                    .join('');
            } else if (hypotheticalCounterStyleByName[token.value]) {
                var counterStyles = [];
                Object.keys(hypotheticalCounterStyleByName).forEach(function (counterStyleName) {
                    counterStyles.push({ name: counterStyleName, predicates: hypotheticalCounterStyleByName[counterStyleName].predicates, props: hypotheticalCounterStyleByName[counterStyleName].value});
                });
                text += getCounterCharacters({ props: hypotheticalCounterStyleByName[token.value].value }, counterStyles, possibleCounterValuesByName[token.name] || [0]);
            } else {
                // Warn: Undefined counter style?
            }
            if (token.type === 'counters') {
                text += token.separator;
            }
        } else if (token.type === 'open-quote' || token.type === 'close-quote') {
            text += extractQuotes(quotes, token.type);
        } else if (token.type === 'attr') {
            text += node.getAttribute(token.value) || '';
        }
    });
    return text;
}

function extractTextFromContentPropertyValue(value, node, hypotheticalQuotesValues, hypotheticalCounterStyleValuesByName, possibleCounterValuesByName) {
    var tokens = tokenizeContent(value);
    var isSeenByCounterStyle = {};
    function markCounterStyleAsSeen(counterStyleName) {
        if (!counterRendererByListStyleType[counterStyleName]) {
            isSeenByCounterStyle[counterStyleName] = true;
            var hypotheticalValues = hypotheticalCounterStyleValuesByName[counterStyleName];
            if (hypotheticalValues) {
                hypotheticalValues.forEach(function (hypotheticalValue) {
                    if (hypotheticalValue.value.fallback) {
                        markCounterStyleAsSeen(hypotheticalValue.value.fallback);
                    }
                });
            }
        }
    }

    tokens.forEach(function (token) {
        if (token.type === 'counter' || token.type === 'counters') {
            markCounterStyleAsSeen(token.value);
        }
    });
    var usesQuotes = tokens.some(function (token) {
        return token.type === 'open-quote' || token.type === 'close-quote';
    });
    function expandCounterStyles(quotes) {
        var referencedCounterStyleNames = Object.keys(isSeenByCounterStyle);
        if (referencedCounterStyleNames.length > 0) {
            var result = [];
            expandPermutations(hypotheticalCounterStyleValuesByName, referencedCounterStyleNames).forEach(function (hypotheticalCounterStyleByName) {
                var content = expandContent(tokens, node, quotes, hypotheticalCounterStyleByName, possibleCounterValuesByName);
                if (content) {
                    result.push({
                        value: content,
                        truePredicates: Object.keys(hypotheticalCounterStyleByName).reduce(function (acc, counterStyleName) {
                            return Object.assign(acc, hypotheticalCounterStyleByName[counterStyleName].truePredicates);
                        }, {}),
                        falsePredicates: Object.keys(hypotheticalCounterStyleByName).reduce(function (acc, counterStyleName) {
                            return Object.assign(acc, hypotheticalCounterStyleByName[counterStyleName].falsePredicates);
                        }, {})
                    });
                }
            });
            return result;
        } else {
            return [{ value: expandContent(tokens, node, quotes, hypotheticalCounterStyleValuesByName, possibleCounterValuesByName), falsePredicates: {}, truePredicates: {}}];
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

var unescapeCssString = require('./unescapeCssString');
var unquote = require('./unquote');
var charactersByListStyleType = require('./charactersByListStyleType');

function getCounterCharacters(counterStyle, counterStyles) {
    var text = '';
    if (typeof counterStyle.props.symbols === 'string') {
        counterStyle.props.symbols.replace(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)|([^'" ]+))/g, function ($0, doubleQuotedString, singleQuotedString, url, other) {
            if (typeof doubleQuotedString === 'string') {
                text += unescapeCssString(doubleQuotedString);
            } else if (typeof singleQuotedString === 'string') {
                text += unescapeCssString(singleQuotedString);
            } else if (typeof other === 'string') {
                text += other.trim();
            }
        });
    }
    ['prefix', 'suffix'].forEach(function (propertyName) {
        var value = counterStyle.props[propertyName];
        if (typeof value === 'string') {
            text += unescapeCssString(unquote(value));
        }
    });
    ['additive-symbols', 'pad'].forEach(function (propertyName) {
        var value = counterStyle.props[propertyName];
        if (typeof value === 'string') {
            value.replace(/\d+ (?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)))/g, function ($0, doubleQuotedString, singleQuotedString) {
                if (typeof doubleQuotedString === 'string') {
                    text += unescapeCssString(doubleQuotedString);
                } else if (typeof singleQuotedString === 'string') {
                    text += unescapeCssString(singleQuotedString);
                }
            });
        }
    });
    var fallback = counterStyle.props.fallback;
    if (fallback) {
        if (charactersByListStyleType[fallback]) {
            text += charactersByListStyleType[fallback];
        } else {
            counterStyles.forEach(function (counterStyle) {
                if (counterStyle.name === fallback) {
                    text += getCounterCharacters(counterStyle, counterStyles);
                }
            });
        }
    }
    return text;
}

module.exports = getCounterCharacters;

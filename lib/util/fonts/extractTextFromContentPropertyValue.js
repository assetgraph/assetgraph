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

function extractTextFromContentPropertyValue(value, node, quotes) {
    if (value === 'none' || value === 'normal' || typeof value === 'undefined') {
        return '';
    } else {
        // <content-list> = [ <string> | contents | <image> | <quote> | <target> | <leader()> ]+

        var text = '';
        value.replace(/(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|counter\(\s*[a-z0-9-]+\s*,\s*([a-z0-9-]+)\s*\)|([^'"]+)/g, function ($0, url, doubleQuotedString, singleQuotedString, counterStyle, other) {
            if (typeof doubleQuotedString === 'string') {
                text += unescapeCssString(doubleQuotedString);
            } else if (typeof singleQuotedString === 'string') {
                text += unescapeCssString(singleQuotedString);
            } else if (url) {
                // ignore
            } else if (counterStyle) {
                text += (charactersByListStyleType[counterStyle] || '');
            } else {
                other = other.trim();
                if (other === 'open-quote' || other === 'close-quote') {
                    text += extractQuotes(quotes, other);
                } else {
                    var matchAttr = other.trim().match(/^attr\(([\w-]+)\)$/);
                    if (matchAttr) {
                        var attributeValue = node.getAttribute(matchAttr[1]);
                        if (attributeValue) {
                            text += attributeValue;
                        }
                    }
                }
            }
        });
        return text;
    }
}
module.exports = extractTextFromContentPropertyValue;

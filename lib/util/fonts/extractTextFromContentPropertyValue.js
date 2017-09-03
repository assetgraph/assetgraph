function unescapeCssString(cssString) {
    return cssString.replace(/\\([0-9a-f]{1,6})\s*/ig, function ($0, hexDigits) {
        return String.fromCharCode(parseInt(hexDigits, 16));
    })
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\/g, '');
}

function extractTextFromContentPropertyValue(value, node) {
    if (value === 'none' || value === 'normal' || typeof value === 'undefined') {
        return '';
    } else {
        // <content-list> = [ <string> | contents | <image> | <quote> | <target> | <leader()> ]+

        var text = '';
        value.replace(/(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'"]+)/g, function ($0, url, doubleQuotedString, singleQuotedString, other) {
            if (typeof doubleQuotedString === 'string') {
                text += unescapeCssString(doubleQuotedString);
            } else if (typeof singleQuotedString === 'string') {
                text += unescapeCssString(singleQuotedString);
            } else if (url) {
                // ignore
            } else {
                var matchAttr = other.trim().match(/^attr\(([\w-]+)\)$/);
                if (matchAttr) {
                    var attributeValue = node.getAttribute(matchAttr[1]);
                    if (attributeValue) {
                        text += attributeValue;
                    }
                }
            }
        });
        return text;
    }
}
module.exports = extractTextFromContentPropertyValue;

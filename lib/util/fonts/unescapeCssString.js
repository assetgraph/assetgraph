function unescapeCssString(cssString) {
    return cssString.replace(/\\([0-9a-f]{1,6})\s*/ig, function ($0, hexDigits) {
        return String.fromCharCode(parseInt(hexDigits, 16));
    })
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\/g, '');
}

module.exports = unescapeCssString;

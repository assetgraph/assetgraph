function unescapeCssString(cssString) {
  return cssString
    .replace(/\\([0-9a-f]{1,6})\s*/gi, ($0, hexDigits) =>
      String.fromCharCode(parseInt(hexDigits, 16))
    )
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\/g, '');
}

module.exports = unescapeCssString;

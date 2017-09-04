var unquote = require('./unquote');

function getGoogleIdForFontProps(fontProps) {
    var family = unquote(fontProps['font-family']
        .split(',')[0]
        .replace(' ', '+'));

    var weight = fontProps['font-weight'];

    var italic = fontProps['font-style'] === 'italic';

    return [family, ':', weight, italic ? 'i' : ''].join('');
}

module.exports = getGoogleIdForFontProps;

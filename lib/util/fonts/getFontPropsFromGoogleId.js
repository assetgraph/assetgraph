function getFontPropsFromGoogleId(googleId) {
    var pair = googleId.split(':');

    return {
        'font-family': pair[0].replace(/\+/g, ' '),
        'font-weight': parseInt(pair[1]),
        'font-style': pair[1].match(/(?:i|italic)$/) ? 'italic' : 'normal'
    };
}

module.exports = getFontPropsFromGoogleId;

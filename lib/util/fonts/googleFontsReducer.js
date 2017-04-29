var _ = require('lodash');

function getGoogleWebFontId(textFontPropertyObject) {
    var family = textFontPropertyObject.props['font-family']
        .split(',')[0]
        .replace(' ', '+');

    var weight = textFontPropertyObject.props['font-weight'];

    var italic = textFontPropertyObject.props['font-style'] === 'italic';

    return [family, ':', weight, italic ? 'i' : ''].join('');
}

function googleFontsReducer(textFontPropertiesArray) {
    var fonts = {};

    textFontPropertiesArray
        .filter(function (obj) {
            return obj.props['font-family'];
        })
        .forEach(function (obj) {
            var id = getGoogleWebFontId(obj);

            if (!fonts[id]) {
                fonts[id] = {
                    texts: [],
                    props: Object.assign({}, obj.props)
                };
            }

            fonts[id].texts.push(obj.text);
        });

    Object.keys(fonts)
        .forEach(function (id) {
            fonts[id].text = _.uniq(fonts[id].texts.join(''))
                .filter(function (char) { return char !== ' '; })
                .sort()
                .join('');
        });

    return fonts;
}

module.exports = googleFontsReducer;

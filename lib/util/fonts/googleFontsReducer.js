var _ = require('lodash');
var getGoogleIdForFontProps = require('./getGoogleIdForFontProps');

function googleFontsReducer(textFontPropertiesArray) {
    var fonts = {};

    textFontPropertiesArray
        .filter(function (obj) {
            return obj.props['font-family'];
        })
        .forEach(function (obj) {
            var id = getGoogleIdForFontProps(obj.props);

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
                .sort()
                .join('');
        });

    return fonts;
}

module.exports = googleFontsReducer;

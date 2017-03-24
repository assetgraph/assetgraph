var getTextByFontFace = require('../util/getTextByFontFace');

var googleFontsUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;

module.exports = function (queryObj) {
    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        // Temporary User-Agent override to trigger google to serve woff
        assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

        assetGraph.populate({
            followRelations: {
                to: { url: googleFontsUrlRegex }
            }
        })
        .queue(function (assetGraph) {
            var textByFontFace = getTextByFontFace(assetGraph);
            var fontFamiliesToSubset = Object.keys(textByFontFace);


            fontFamiliesToSubset.forEach(function (fontFamily) {
                var subsetConfig = textByFontFace[fontFamily];
                var oldAsset = subsetConfig.cssFontFaceSrc.from;

                if (googleFontsUrlRegex.test(oldAsset.url)) {
                    oldAsset.replaceWith(new assetGraph.Css({
                        url: oldAsset.url + '&text=' + encodeURIComponent(subsetConfig.chars.join(''))
                    }));
                }
            });
        })
        // .populate({
        //     from: {
        //         url: /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/
        //     },
        //     followRelations: {
        //         type: 'CssFontFaceSrc'
        //     }
        // })
        .then(function (assetGraph) {
            // Undo User-Agent override
            assetGraph.teepee.headers['User-Agent'] = assetGraphUA;

            cb();
        });
    };
};

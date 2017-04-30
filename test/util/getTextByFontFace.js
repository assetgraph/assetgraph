var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');
var getTextByFontFace = require('../../lib/util/getTextByFontFace');

describe('util/getTextByFontFace', function () {
    it.skip('should take browser default stylesheet into account', function () {
        var htmlText = [
            '<style>@font-face { font-family: "font1"; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/notoserif/v4/Q47Ro23nlKqZrOLipd3-SwsYbbCjybiHxArTLjt7FRU.woff2) format("woff2");}</style>',
            '<style>@font-face { font-family: "font2"; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/notoserif/v4/Q47Ro23nlKqZrOLipd3-SwsYbbCjybiHxArTLjt7FRU.woff2) format("woff2");}</style>',
            '<style>h1 { font-family: font1; }</style>',
            '<style>span { font-family: font2; }</style>',
            '<h1>foo <span>bar</span></h1>'
        ].join('\n');

        return new AssetGraph({})
            .loadAssets(new AssetGraph.Html({
                text: htmlText
            }))
            .populate()
            .queue(function (assetGraph) {
                expect(getTextByFontFace(assetGraph), 'to satisfy', {
                    'font1:400': {
                        textContent: 'foo'
                    },

                    'font2:400': {
                        textContent: 'bar'
                    }
                });
            });
    });
});

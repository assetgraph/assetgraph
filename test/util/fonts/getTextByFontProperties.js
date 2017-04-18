var expect = require('unexpected');
var AssetGraph = require('../../../lib');
var getTextByFontProp = require('../../../lib/util/fonts/getTextByFontProperties');

describe('util/fonts/getTextByFontProp', function () {
    it('should take browser default stylesheet into account', function () {
        var htmlText = [
            '<style>h1 { font-family: font1; } span { font-family: font2; }</style>',
            '<h1>foo <span>bar</span></h1>'
        ].join('\n');

        return new AssetGraph({})
            .loadAssets(new AssetGraph.Html({
                text: htmlText
            }))
            .populate()
            .queue(function (assetGraph) {
                expect(getTextByFontProp(assetGraph.findAssets({type: 'Html'})[0]), 'to exhaustively satisfy', [
                    {
                        text: 'foo',
                        props: {
                            'font-family': 'font1',
                            'font-weight': 'bold',
                            'font-style': undefined
                        }
                    },
                    {
                        text: 'bar',
                        props: {
                            'font-family': 'font2',
                            'font-weight': 'bold',
                            'font-style': undefined
                        }
                    }
                ]);
            });
    });
});

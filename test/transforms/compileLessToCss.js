var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/compileLessToCss', function () {
    it('should compile all Less assets to Css', function (done) {
        new AssetGraph({root: __dirname + '/compileLessToCss/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: query.not(/^http:/)}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Less');
            })
            .compileLessToCss({type: 'Less'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Less');
                expect(assetGraph, 'to contain asset', 'Css');

                var htmlText = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(htmlText, 'not to contain', 'stylesheet/less');
                expect(htmlText, 'not to contain', 'styles.less');
                expect(htmlText, 'to contain', '<link rel="stylesheet" href="styles.css">');

                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to equal',
                    '#header {\n' +
                    '  color: #333333;\n' +
                    '  border-left: 1px;\n' +
                    '  border-right: 2px;\n' +
                    '}\n' +
                    '#footer {\n' +
                    '  color: #114411;\n' +
                    '  border-color: #7d2717;\n' +
                    '}\n'
                );
            })
            .run(done);
    });
});

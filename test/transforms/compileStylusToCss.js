var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/compileStylusToCss', function () {
    it('should convert all Stylus assets to Css', function (done) {
        new AssetGraph({root: __dirname + '/compileStylusToCss/'})
            .loadAssets('example.styl')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Stylus');
            })
            .compileStylusToCss({type: 'Stylus'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Stylus');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to equal',
                    'body {\n' +
                    '  color: #f00;\n' +
                    '}\n' +
                    'body a {\n' +
                    '  font: 12px/1.4 "Lucida Grande", Arial, sans-serif;\n' +
                    '  background: #000;\n' +
                    '  color: #ccc;\n' +
                    '}\n' +
                    'form input {\n' +
                    '  padding: 5px;\n' +
                    '  border: 1px solid;\n' +
                    '  -webkit-border-radius: 5px;\n' +
                    '  -moz-border-radius: 5px;\n' +
                    '  border-radius: 5px;\n' +
                    '}\n'
                );
            })
            .run(done);
    });
});

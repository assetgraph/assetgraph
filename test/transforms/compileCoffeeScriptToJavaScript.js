/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/compileCoffeeScriptToJavaScript', function () {
    it('should compile all CoffeeScript assets in the graph', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileCoffeeScriptToJavaScript/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: query.not(/^http:/)}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'CoffeeScript', 2);
            })
            .compileCoffeeScriptToJavaScript({type: 'CoffeeScript'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'CoffeeScript');
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);

                var htmlText = assetGraph.findAssets({type: 'Html'})[0].text;

                expect(htmlText, 'not to contain', 'text/coffeescript');
                expect(htmlText, 'not to contain', 'index.coffee');
                expect(htmlText, 'to contain', '<script src="index.js">');
            })
            .run(done);
    });
});

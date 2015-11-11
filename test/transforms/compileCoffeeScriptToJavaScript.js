/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    mozilla = require('source-map'),
    query = AssetGraph.query;

describe('transforms/compileCoffeeScriptToJavaScript', function () {
    it('should compile all CoffeeScript assets in the graph', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/compileCoffeeScriptToJavaScript/'})
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
            .serializeSourceMaps()
            .queue(function (assetGraph) {
                var sourceMaps = assetGraph.findAssets({type: 'SourceMap'});
                expect(sourceMaps[1].parseTree.sources, 'to satisfy', [
                    assetGraph.root + 'index.coffee'
                ]);
                var consumer = new mozilla.SourceMapConsumer(sourceMaps[1].parseTree);
                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'index.coffee',
                    line: 1,
                    column: 0
                }), 'to equal', {
                    line: 1,
                    column: 0,
                    lastColumn: null
                });

                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'index.coffee',
                    line: 3,
                    column: 0
                }), 'to equal', {
                    line: 2,
                    column: 8,
                    lastColumn: null
                });
            });
    });
});

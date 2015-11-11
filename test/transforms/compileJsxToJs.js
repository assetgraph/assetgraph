/* global describe, it */
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    mozilla = require('source-map'),
    query = AssetGraph.query;

describe('transforms/compileJsxToJs', function () {
    it('should compile Jsx asset to Js', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/compileJsxToJs/singleJsxFile/'})
            .loadAssets('index.html')
            .populate({followRelations: {to: {url: query.not(/^http:/)}}})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Jsx');
            })
            .compileJsxToJs({type: 'Jsx'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Jsx');
                expect(assetGraph, 'to contain asset', 'JavaScript');

                var htmlText = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(htmlText, 'not to contain', 'helloWorld.jsx');
                expect(htmlText, 'to contain', '<script src="helloWorld.js"></script>');

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', [
                    '/** @jsx React.DOM */',
                    'React.renderComponent(',
                    '  React.createElement("h1", null, "Hello, world!"),',
                    '  document.getElementById(\'example\')',
                    ');',
                    ''
                ].join('\n'));
            });
    });
    it('should compile all Jsx assets to Js', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/compileJsxToJs/jsxWithInclude/', followRelations: {}})
            .loadAssets('index.jsx')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Jsx');
            })
            .compileJsxToJs({type: 'Jsx'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Jsx');
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', [
                    '/** @jsx React.DOM */',
                    'React.renderComponent(React.createElement(\'h1\',null,\'Hello, world!\'),document.getElementById(\'example\'));INCLUDE(\'include.js\');'
                ].join('\n'));
            })
            .serializeSourceMaps()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'SourceMap', 2);
                var sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
                expect(sourceMap.parseTree.sources, 'to satisfy', [
                    assetGraph.root + 'index.jsx'
                ]);
                var consumer = new mozilla.SourceMapConsumer(sourceMap.parseTree);

                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'index.jsx',
                    line: 2,
                    column: 0
                }), 'to equal', {
                    line: 1,
                    column: 0,
                    lastColumn: null
                });

                expect(consumer.generatedPositionFor({
                    source: assetGraph.root + 'index.jsx',
                    line: 3,
                    column: 0
                }), 'to equal', {
                    line: 2,
                    column: 6,
                    lastColumn: null
                });
            });
    });
});

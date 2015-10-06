/* global describe, it */
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/compileJsxToJs', function () {
    it('should compile Jsx asset to Js', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileJsxToJs/singleJsxFile/'})
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
                    '  React.DOM.h1(null, "Hello, world!"),',
                    '  document.getElementById(\'example\')',
                    ');',
                    ''
                ].join('\n'));
            })
            .run(done);
    });
    it('should compile all Jsx assets to Js', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/compileJsxToJs/jsxWithInclude/', followRelations: {}})
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
                    'React.renderComponent(React.DOM.h1(null,\'Hello, world!\'),document.getElementById(\'example\'));INCLUDE(\'include.js\');'
                ].join('\n'));
            })
            .run(done);
    });
});

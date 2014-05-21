/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/CssFontFaceSrc', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssFontFaceSrc/simple/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'CssFontFaceSrc');

                assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].inline();
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /url\('data:/);

                assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].detach();
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'not to contain', 'url(data:');
            })
            .run(done);
    });

    it('should handle a test case with multiple src properties in one rule and multiple urls in one value', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssFontFaceSrc/multipleSrc/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relations', 'CssFontFaceSrc', 6);

                assetGraph.findAssets({url: /\/fontawesome-webfont\.ttf$/})[0].url = 'http://example.com/foo.ttf';

                expect(assetGraph.findRelations({to: {url: /\/foo\.ttf$/}})[0].href, 'to equal', 'http://example.com/foo.ttf');

                expect(assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules[1].style.getPropertyValue('src').match(/\burl\((\'|\"|)([^\'\"]+?)\1\)/g), 'to equal', [
                    'url(\'fontawesome-webfont.eot?#iefix\')',
                    'url(\'fontawesome-webfont.woff\')',
                    'url(\'http://example.com/foo.ttf\')',
                    'url(\'fontawesome-webfont.svgz#FontAwesomeRegular\')',
                    'url(\'fontawesome-webfont.svg#FontAwesomeRegular\')'
                ]);
            })
            .run(done);
    });
});

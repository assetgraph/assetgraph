var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('css @font-face {src: ...}').addBatch({
    'After loading simple test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssFontFaceSrc/simple/'})
                .loadAssets('index.css')
                .populate()
                .run(done);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the graph should contain one CssFontFaceSrc relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'CssFontFaceSrc');
        },
        'then inline the CssFontFaceSrc relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].inline();
                return assetGraph;
            },
            'the Css asset should contain a data: url': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /url\('data:/);
            },
            'then detach the CssFontFaceSrc relation': {
                topic: function (assetGraph) {
                    assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].detach();
                    return assetGraph;
                },
                'the Css asset should not contain a data: url': function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'Css'})[0].text, 'not to contain', 'url(data:');
                }
            }
        }
    },
    'After loading test case with multiple src properties in one rule and multiple urls in one value': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssFontFaceSrc/multipleSrc/'})
                .loadAssets('index.css')
                .populate()
                .run(done);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the graph should contain 6 CssFontFaceSrc relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssFontFaceSrc', 6);
        },
        'then change the url of the true type font': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/fontawesome-webfont\.ttf$/})[0].url = 'http://example.com/foo.ttf';
                return assetGraph;
            },
            'the href of the incoming relation should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({to: {url: /\/foo\.ttf$/}})[0].href, 'to equal', 'http://example.com/foo.ttf');
            },
            'the url tokens should still come in the right order': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules[1].style.getPropertyValue('src').match(/\burl\((\'|\"|)([^\'\"]+?)\1\)/g), 'to equal', [
                    "url('fontawesome-webfont.eot?#iefix')",
                    "url('fontawesome-webfont.woff')",
                    "url('http://example.com/foo.ttf')",
                    "url('fontawesome-webfont.svgz#FontAwesomeRegular')",
                    "url('fontawesome-webfont.svg#FontAwesomeRegular')"
                ]);
            }
        }
    }
})['export'](module);

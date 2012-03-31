var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('css @font-face {src: ...}').addBatch({
    'After loading simple test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssFontFaceSrc/simple/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain one CssFontFaceSrc relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssFontFaceSrc'}).length, 1);
        },
        'then inline the CssFontFaceSrc relation': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].inline();
                return assetGraph;
            },
            'the Css asset should contain a data: url': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Css'})[0].text, /url\('data:/);
            },
            'then detach the CssFontFaceSrc relation': {
                topic: function (assetGraph) {
                    assetGraph.findRelations({type: 'CssFontFaceSrc'})[0].detach();
                    return assetGraph;
                },
                'the Css asset should not contain a data: url': function (assetGraph) {
                    assert.equal(assetGraph.findAssets({type: 'Css'})[0].text.indexOf('url(data:'), -1);
                }
            }
        }
    },
    'After loading test case with multiple src properties in one rule and multiple urls in one value': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssFontFaceSrc/multipleSrc/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain 6 CssFontFaceSrc relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssFontFaceSrc'}).length, 6);
        },
        'then change the url of the true type font': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/fontawesome-webfont\.ttf$/})[0].url = 'http://example.com/foo.ttf';
                return assetGraph;
            },
            'the href of the incoming relation should be updated': function (assetGraph) {
                assert.equal(assetGraph.findRelations({to: {url: /\/foo\.ttf$/}})[0].href, 'http://example.com/foo.ttf');
            },
            'the url tokens should still come in the right order': function (assetGraph) {
                assert.deepEqual(assetGraph.findAssets({type: 'Css'})[0].parseTree.cssRules[1].style.getPropertyValue('src').match(/\burl\((\'|\"|)([^\'\"]+?)\1\)/g),
                                 [
                                     "url('fontawesome-webfont.eot?#iefix')",
                                     "url('fontawesome-webfont.woff')",
                                     "url('http://example.com/foo.ttf')",
                                     "url('fontawesome-webfont.svgz#FontAwesomeRegular')",
                                     "url('fontawesome-webfont.svg#FontAwesomeRegular')"
                                 ]
                                );
            }
        }
    }
})['export'](module);

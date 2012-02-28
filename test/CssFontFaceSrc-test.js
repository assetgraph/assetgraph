var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('css @font-face {src: ...}').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssFontFaceSrc/'})
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
    }
})['export'](module);

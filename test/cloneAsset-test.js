var vows = require('vows'),
    assert = require('assert'),
    seq = require('seq'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Cloning assets').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cloneAsset/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
        },
        'the graph should contain a single Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph should contain a single inline Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 1);
        },
        'then cloning the first Html asset': {
            topic: function (assetGraph) {
                var indexHtml = assetGraph.findAssets({type: 'Html'})[0],
                    assetClone = indexHtml.clone();
                assetClone.url = indexHtml.url.replace(/\.html$/, ".clone.html");
                return assetGraph;
            },
            'the clone should be in the graph': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/index\.clone\.html$/}).length, 1);
            },
            'the clone should have an HtmlAnchor relation to anotherpage.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {url: /\/anotherpage\.html$/}}).length, 1);
            },
            'the clone should have an HtmlAnchor relation to yetanotherpage.html': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {url: /\/yetanotherpage\.html$/}}).length, 1);
            },
            'the clone should have an HtmlStyle relation to an inline stylesheet': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {url: /\/index\.clone\.html$/}, to: {type: 'Css'}}).length, 1);
            },
            'the graph should still contain a single Png asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            },
            'the graph should contain two inline Css assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css', isInline: true}).length, 2);
            },
            'the text of the original and the cloned asset should be identical': function (assetGraph) {
                var originalAndCloned = assetGraph.findAssets({url: /\/index(?:\.clone)?.html/});
                assert.equal(originalAndCloned[0].text, originalAndCloned[1].text);
            }
        }
    }
})['export'](module);

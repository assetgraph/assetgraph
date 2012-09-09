var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Charset test').addBatch({
    'After loading Html assets with meta tags specifying iso-8859-1': {
        topic: function () {
            new AssetGraph({root: __dirname + '/encoding/'})
                .loadAssets('iso-8859-1.html', 'iso-8859-1-simple-meta.html')
                .populate()
                .run(this.callback);
        },
        'the body should be decoded correctly': function (assetGraph) {
            assetGraph.findAssets().forEach(function (asset) {
                assert.notEqual(asset.text.indexOf('æøåÆØÅ'), -1);
            });
        },
        'the parseTree should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets()[0].parseTree.body.firstChild.nodeValue, 'æøåÆØÅ');
        },
        'then reserializing the Html asset': {
            topic: function (assetGraph) {
                return assetGraph.findAssets()[0].rawSrc;
            },
            'the src should be encoded as iso-8859-1 again': function (rawSrc) {
                assert.notEqual(rawSrc.toString('binary').indexOf("\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5"), -1);
            }
        }
    },
    'After loading a Css asset with @charset declaration of iso-8859-1': {
        topic: function () {
            new AssetGraph({root: __dirname + '/encoding/'})
                .loadAssets('iso-8859-1.css')
                .populate()
                .run(this.callback);
        },
        'the body should be decoded correctly': function (assetGraph) {
             assert.notEqual(assetGraph.findAssets()[0].text.indexOf('æøå'), -1);
        },
        'the parseTree should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets()[0].parseTree.cssRules[0].style.foo, 'æøå');
        }
    }
})['export'](module);

var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Charset test').addBatch({
    'After loading Html assets with meta tags specifying iso-8859-1': {
        topic: function () {
            new AssetGraph({root: __dirname + '/encoding/'})
                .loadAssets('iso-8859-1.html', 'iso-8859-1-simple-meta.html')
                .populate()
                .run(done);
        },
        'the body should be decoded correctly': function (assetGraph) {
            assetGraph.findAssets().forEach(function (asset) {
                expect(asset.text, 'to contain', 'æøåÆØÅ');
            });
        },
        'the parseTree should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets()[0].parseTree.body.firstChild.nodeValue, 'to equal', 'æøåÆØÅ');
        },
        'then reserializing the Html asset': {
            topic: function (assetGraph) {
                return assetGraph.findAssets()[0].rawSrc;
            },
            'the src should be encoded as iso-8859-1 again': function (rawSrc) {
                expect(rawSrc.toString('binary'), 'to contain', "\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5");
            }
        }
    },
    'After loading a Css asset with @charset declaration of iso-8859-1': {
        topic: function () {
            new AssetGraph({root: __dirname + '/encoding/'})
                .loadAssets('iso-8859-1.css')
                .populate()
                .run(done);
        },
        'the body should be decoded correctly': function (assetGraph) {
             expect(assetGraph.findAssets()[0].text, 'to contain', 'æøå');
        },
        'the parseTree should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({})[0].parseTree.cssRules[0].style.foo, 'to equal', 'æøå');
        }
    }
})['export'](module);

var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Charset test').addBatch({
    'After loading HTML with a meta tag specifying iso-8859-1': {
        topic: function () {
            new AssetGraph({root: __dirname + '/charset/'}).transform(
                transforms.loadAssets('iso-8859-1.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the body should be decoded correctly': function (assetGraph) {
             assert.notEqual(assetGraph.findAssets()[0].decodedSrc.indexOf('æøåÆØÅ'), -1);
        },
        'the parseTree should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets()[0].parseTree.body.firstChild.nodeValue, 'æøåÆØÅ');
        },
        'then reserializing the HTML asset': {
            topic: function (assetGraph) {
                assetGraph.serializeAsset(assetGraph.findAssets()[0], this.callback);
            },
            'the src should be encoded as iso-8859-1 again': function (src) {
                assert.notEqual(src.toString().indexOf("\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5"), -1);
            }
        }
    },
    'After loading HTML with a data: url anchor': {
        topic: function () {
            new AssetGraph({root: __dirname + '/charset/'}).transform(
                transforms.loadAssets('dataUrl.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 2 HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the body of the data: url HTML should contain a smiley character': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'})[1].parseTree.body.firstChild.nodeValue,
                         "\u0263a");
        }
    },
    'After loading a CSS asset with @charset declaration of iso-8859-1': {
        topic: function () {
            new AssetGraph({root: __dirname + '/charset/'}).transform(
                transforms.loadAssets('iso-8859-1.css'),
                transforms.populate(),
                this.callback
            );
        },
        'the body should be decoded correctly': function (assetGraph) {
             assert.notEqual(assetGraph.findAssets()[0].decodedSrc.indexOf('æøå'), -1);
        },
        'the parseTree should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets()[0].parseTree.cssRules[0].style.foo, 'æøå');
        }
    }
})['export'](module);

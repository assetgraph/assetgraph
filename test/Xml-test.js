var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Xml').addBatch({
    'After loading a test case with an Xml asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Xml/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain one Xml asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Xml'}).length, 1);
        },
        'the parseTree of the Xml asset should contain a Description tag': function (assetGraph) {
            var xml = assetGraph.findAssets({type: 'Xml'})[0];
            assert.equal(xml.parseTree.getElementsByTagName('Description').length, 1);
        },
        'then manipulate the Description tag and mark the Xml asset dirty': {
            topic: function (assetGraph) {
                var xml = assetGraph.findAssets({type: 'Xml'})[0];
                xml.parseTree.getElementsByTagName('Description')[0].setAttribute('yay', 'foobarquux');
                xml.markDirty();
                return assetGraph;
            },
            'the text of the Xml asset should contain "foobarquux"': function (assetGraph) {
                var xml = assetGraph.findAssets({type: 'Xml'})[0];
                assert.matches(xml.text, /foobarquux/);
            }
        }
    }
})['export'](module);

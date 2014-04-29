var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('Xml').addBatch({
    'After loading a test case with an Xml asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Xml/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain one Xml asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Xml');
        },
        'the parseTree of the Xml asset should contain a Description tag': function (assetGraph) {
            var xml = assetGraph.findAssets({type: 'Xml'})[0];
            expect(xml.parseTree.getElementsByTagName('Description'), 'to have length', 1);
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
                expect(xml.text, 'to match', /foobarquux/);
            }
        }
    }
})['export'](module);

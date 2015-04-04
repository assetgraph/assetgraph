/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('assets/Xml', function () {
    it('should handle a test case with an existing Xml asset', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Xml/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Xml');

                var xml = assetGraph.findAssets({type: 'Xml'})[0];
                expect(xml.parseTree.getElementsByTagName('Description'), 'to have property', 'length', 1);

                xml.parseTree.getElementsByTagName('Description')[0].setAttribute('yay', 'foobarquux');
                xml.markDirty();
                expect(xml.text, 'to match', /foobarquux/);
            })
            .run(done);
    });
});

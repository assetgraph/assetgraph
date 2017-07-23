/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Atom', function () {
    it('should find an Atom asset', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/assets/Atom/'})
            .loadAssets('feed.atom')
            .populate();

        expect(assetGraph, 'to contain asset', 'Atom');
        expect(assetGraph, 'to contain asset', 'Png');
        expect(assetGraph, 'to contain assets', {type: 'Html', isInline: true}, 2);
        expect(assetGraph, 'to contain assets', {type: 'Html', isInline: false}, 1);

        assetGraph.findAssets({fileName: 'bar.html'})[0].url = 'http://example.com/bar.html';

        expect(assetGraph, 'to contain asset', {type: 'Atom', text: /and a &lt;a href="http:\/\/example.com\/bar.html"/});
    });
});

/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlEmbed', function () {
    it('should handle a test case with an existing <embed src="..."> element', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlEmbed/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relation', 'HtmlEmbed');
        expect(assetGraph, 'to contain asset', 'Flash');
        expect(assetGraph, 'to contain relation', {type: 'HtmlEmbed', href: 'foo.swf'});
        assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
        expect(assetGraph, 'to contain relation', {type: 'HtmlEmbed', href: '../foo.swf'});
    });
});

/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlAuthorLink', function () {
    it('should handle a test case with an existing <link rel="author">', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlAuthorLink/'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relations', 'HtmlAuthorLink', 2);
        expect(assetGraph, 'to contain assets', 'Text', 2);
    });
});

const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/JsonUrl', function () {
    it('should get the href correctly', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/JsonUrl/')});
        await assetGraph.loadAssets('app.webmanifest');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 1);
        expect(assetGraph, 'to contain relations', 'JsonUrl', 1);

        expect(assetGraph.findRelations({ type: 'JsonUrl' }), 'to satisfy', [
            {
                href: 'index.html',
                hrefType: 'relative'
            }
        ]);
    });

    it('should set the href correctly', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/JsonUrl/')});
        await assetGraph.loadAssets('app.webmanifest');
        await assetGraph.populate();

        assetGraph.findAssets({ type: 'Html'})[0].fileName = 'foo.html';

        expect(assetGraph.findRelations({ type: 'JsonUrl' }), 'to satisfy', [
            {
                href: 'foo.html',
                hrefType: 'relative'
            }
        ]);
    });
});

const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../');
const pathModule = require('path');

describe('FileRedirect relation', function () {
    it('should expand dir without trailing slash', async function () {
        const assetGraph = await new AssetGraph({ root: pathModule.resolve(__dirname, '..', '..', 'testdata', 'relations', 'FileRedirect', 'noTrailingSlash') })
            .loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain relation', 'FileRedirect');
        expect(assetGraph, 'to contain asset', 'Asset');
        expect(assetGraph.findRelations({ type: 'FileRedirect' })[0], 'to satisfy', {
            from: { url: assetGraph.root + 'subdir' },
            to: { url: assetGraph.root + 'subdir/index.html' }
        });
    });

    it('should expand dir with trailing slash', async function () {
        const assetGraph = await new AssetGraph({ root: pathModule.resolve(__dirname, '..', '..', 'testdata', 'relations', 'FileRedirect', 'trailingSlash') })
            .loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain relation', 'FileRedirect');
        expect(assetGraph, 'to contain asset', 'Asset');
        expect(assetGraph.findRelations({ type: 'FileRedirect' })[0], 'to satisfy', {
            from: { url: assetGraph.root + 'subdir/' },
            to: { url: assetGraph.root + 'subdir/index.html' }
        });
    });
});

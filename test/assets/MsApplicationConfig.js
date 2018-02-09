const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/MsApplicationConfig', function () {
    it('should handle a test case with an existing MsApplicationConfig asset', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/assets/MsApplicationConfig/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph.findAssets()[1], 'to satisfy', {
            text: expect.it('to begin with', '<?xml version="1.0" encoding="utf-8"?>')
        });

        expect(assetGraph.findRelations(), 'to satisfy', [
            { type: 'HtmlMsApplicationConfig' },
            { type: 'MsApplicationConfigImage', href: '/tile/TileImage.png' },
            { type: 'MsApplicationConfigImage', href: '/tile/square70x70logo.png' },
            { type: 'MsApplicationConfigImage', href: '/tile/square150x150logo.png' },
            { type: 'MsApplicationConfigImage', href: '/tile/wide310x150logo.png' },
            { type: 'MsApplicationConfigImage', href: '/tile/square310x310logo.png' },
            { type: 'MsApplicationConfigPollingUri', href: '/badge/polling.xml' },
            { type: 'MsApplicationConfigPollingUri', href: '/notification/polling-1.xml' },
            { type: 'MsApplicationConfigPollingUri', href: '/notification/polling-2.xml' },
            { type: 'MsApplicationConfigPollingUri', href: '/notification/polling-3.xml' },
            { type: 'MsApplicationConfigPollingUri', href: '/notification/polling-4.xml' },
            { type: 'MsApplicationConfigPollingUri', href: '/notification/polling-5.xml' }
        ]);
    });
});

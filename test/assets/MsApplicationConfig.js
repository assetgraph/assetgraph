var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('assets/MsApplicationConfig', function () {
    it('should handle a test case with an existing MsApplicationConfig asset', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/MsApplicationConfig/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets()[1], 'to satisfy', {
                    text: expect.it('to begin with', '<?xml version="1.0" encoding="utf-8"?>')
                });

                expect(assetGraph.findRelations({}, true), 'to satisfy', [
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
            })
            .run(done);
    });
});

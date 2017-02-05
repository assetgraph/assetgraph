var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

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
                    { href: 'tile/TileImage.png' },
                    { href: 'tile/square70x70logo.png' },
                    { href: 'tile/square150x150logo.png' },
                    { href: 'tile/wide310x150logo.png' },
                    { href: 'tile/square310x310logo.png' },
                    { href: 'badge/polling.xml' },
                    { href: 'notification/polling-1.xml' },
                    { href: 'notification/polling-2.xml' },
                    { href: 'notification/polling-3.xml' },
                    { href: 'notification/polling-4.xml' },
                    { href: 'notification/polling-5.xml' }
                ]);
            })
            .run(done);
    });
});

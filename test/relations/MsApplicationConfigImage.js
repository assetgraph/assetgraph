var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/MsApplicationConfigImage', function () {

    it('should handle a test case with an existing <TileImage/> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigImage/'})
            .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations(), 'to satisfy', [
                    { type: 'MsApplicationConfigImage' }
                ]);

                expect(assetGraph.findAssets(), 'to satisfy', [
                    { type: 'MsApplicationConfig' },
                    { fileName: 'icon.png' }
                ]);
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigImage/'})
            .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage');

                var relation = assetGraph.findRelations({ type: 'MsApplicationConfigImage' })[0];

                relation.to.url = 'foo.bar';

                expect(relation, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    it('should inline an image', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigImage/'})
            .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage');

                var relation = assetGraph.findRelations({ type: 'MsApplicationConfigImage' })[0];

                relation.inline();

                expect(relation, 'to satisfy', {
                    href: expect.it('to begin with', 'data:image/png;base64,')
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should throw when trying to attach', function () {
            var relation = new AssetGraph.MsApplicationConfigImage({
                to: new AssetGraph.Png({ url: 'image.png' })
            });

            expect(relation.attach.bind(relation), 'to throw', 'MsApplicationConfigImage.attach: Not supported');
        });
    });

    describe('when programmatically detataching a relation', function () {
        it('it should remove the relation and clean up', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigImage/'})
                .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage', 1);

                    var relation = assetGraph.findRelations({ type: 'MsApplicationConfigImage' })[0];

                    relation.detach();

                    expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage', 0);

                    expect(assetGraph.findAssets({ type: 'MsApplicationConfig'})[0].text, 'not to contain', '<TileImage');
                });
        });
    });
});

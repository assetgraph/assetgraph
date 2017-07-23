const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('relations/MsApplicationConfigPollingUri', function () {
    it('should handle a test case with an existing <TileImage/> element', async function () {
        const warnSpy = sinon.spy().named('warn');
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigPollingUri/'})
            .on('warn', warnSpy)
            .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
            .populate();

        expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^ENOENT.*polling-target/));

        expect(assetGraph.findRelations(), 'to satisfy', [
           { type: 'MsApplicationConfigPollingUri' }
        ]);

        expect(assetGraph.findAssets(), 'to satisfy', [
            { type: 'MsApplicationConfig' },
            { type: 'Xml', fileName: 'polling-target' }
        ]);
    });

    it('should update the href', async function () {
        const warnSpy = sinon.spy().named('warn');
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigPollingUri/'})
            .on('warn', warnSpy)
            .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
            .populate();

        expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^ENOENT.*polling-target/));

        expect(assetGraph, 'to contain relation', 'MsApplicationConfigPollingUri');

        var relation = assetGraph.findRelations({ type: 'MsApplicationConfigPollingUri' })[0];

        relation.to.url = 'foo.bar';

        expect(relation, 'to satisfy', {
            href: '/foo.bar'
        });
    });

    it('should throw when trying to inline', function () {
        var relation = new AssetGraph.MsApplicationConfigPollingUri({
            to: { type: 'Xml', url: '/polling-target' }
        });

        expect(relation.inline.bind(relation), 'to throw', 'MsApplicationConfigPollingUri.inline: Not supported');
    });

    it('should throw when trying to attach', function () {
        var relation = new AssetGraph.MsApplicationConfigPollingUri({
            to: { type: 'Xml', url: '/polling-target' }
        });

        expect(relation.attach.bind(relation), 'to throw', 'MsApplicationConfigPollingUri.attach: Not supported');
    });

    describe('when programmatically detaching a relation', function () {
        it('should remove the relation and clean up', async function () {
            const warnSpy = sinon.spy().named('warn');
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/MsApplicationConfigPollingUri/'})
                .on('warn', warnSpy)
                .loadAssets({ type: 'MsApplicationConfig', url: 'IEconfig.xml'})
                .populate();

            expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^ENOENT.*polling-target/));

            expect(assetGraph, 'to contain relation', 'MsApplicationConfigPollingUri', 1);

            var relation = assetGraph.findRelations({ type: 'MsApplicationConfigPollingUri' })[0];

            relation.detach();

            expect(assetGraph, 'to contain relation', 'MsApplicationConfigPollingUri', 0);

            expect(assetGraph.findAssets({ type: 'MsApplicationConfig'})[0].text, 'not to contain', '<polling-uri');
        });
    });
});

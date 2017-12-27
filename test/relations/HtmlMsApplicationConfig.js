const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlMsApplicationConfig', function () {
    function getHtmlAsset(htmlString) {
        return new AssetGraph({ root: __dirname }).addAsset({
            type: 'Html',
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });
    }

    it('should handle a test case with an existing <meta name="msapplication-config" content="..."> element', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlMsApplicationConfig/'});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain relation', 'HtmlMsApplicationConfig');
        expect(assetGraph, 'to contain asset', { fileName: 'IEconfig.xml' });
    });

    it('should update the href', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlMsApplicationConfig/'});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain relation', 'HtmlMsApplicationConfig');

        const relation = assetGraph.findRelations({ type: 'HtmlMsApplicationConfig' })[0];

        relation.to.url = 'foo.bar';

        expect(relation, 'to satisfy', { href: 'foo.bar' });
    });

    describe('when programmatically adding a relation', function () {
        it('should register a relation when using attach', async function () {
            const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlMsApplicationConfig/'});
            await assetGraph.loadAssets('index.html')
                .populate();

            const previousRelation = assetGraph.findRelations({ type: 'HtmlMsApplicationConfig' })[0];

            previousRelation.from.addRelation({
                type: 'HtmlMsApplicationConfig',
                to: {
                    type: 'Xml',
                    url: 'foo.xml',
                    text: '<?xml version="1.0" encoding="utf-8"?><browserconfig />'
                }
            }, 'before', previousRelation);

            expect(assetGraph.findRelations(), 'to satisfy', [
                {
                    type: 'HtmlMsApplicationConfig',
                    href: 'foo.xml'
                },
                {
                    type: 'HtmlMsApplicationConfig',
                    href: 'IEconfig.xml'
                }
            ]);
        });

        it('should attach a link node in <head>', function () {
            const htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlMsApplicationConfig',
                to: {
                    type: 'Xml',
                    text: '<?xml version="1.0" encoding="utf-8"?><browserconfig />',
                    url: 'foo.xml'
                }
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<meta name="msapplication-config" content="foo.xml">');
        });
    });
});

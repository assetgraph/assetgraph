/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlPreconnectLink', function () {
    function getHtmlAsset(htmlString) {
        const graph = new AssetGraph({ root: __dirname });
        const htmlAsset = new AssetGraph.Html({
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });

        graph.addAsset(htmlAsset);

        return htmlAsset;
    }

    describe('#inline', function () {
        it('should throw', function () {
            const relation = new AssetGraph.HtmlPreconnectLink({
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="preconnect"> element', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPreconnectLink/'});
        await assetGraph.loadAssets('index.html');

        expect(assetGraph, 'to contain relation', 'HtmlPreconnectLink');
    });

    it('should update the href', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPreconnectLink/'});
        await assetGraph.loadAssets('index.html');

        expect(assetGraph, 'to contain relation', 'HtmlPreconnectLink');

        const link = assetGraph.findRelations({ type: 'HtmlPreconnectLink' })[0];

        link.hrefType = 'relative';
        link.to.url = assetGraph.root + 'foo.bar';

        expect(link, 'to satisfy', { href: 'foo.bar' });
    });

    describe('when programmatically adding a relation', function () {
        it('should handle crossorigin url', function () {
            const htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPreconnectLink',
                to: { url: 'http://assetgraph.org' }
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preconnect" href="http://assetgraph.org/" crossorigin="anonymous">');
        });
    });
});

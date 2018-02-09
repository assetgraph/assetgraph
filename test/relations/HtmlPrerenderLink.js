/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlPrerenderLink', function () {
    function getHtmlAsset(htmlString) {
        return new AssetGraph({ root: __dirname }).addAsset({
            type: 'Html',
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });
    }

    describe('#inline', function () {
        it('should throw', function () {
            const relation = getHtmlAsset().addRelation({
                type: 'HtmlPrerenderLink',
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="prerender"> element', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlPrerenderLink/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relation', 'HtmlPrerenderLink');
        expect(assetGraph, 'to contain assets', 'Html', 2);
    });

    it('should update the href', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlPrerenderLink/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relation', 'HtmlPrerenderLink');

        const prerenderLink = assetGraph.findRelations({ type: 'HtmlPrerenderLink' })[0];

        prerenderLink.to.url = 'foo.bar';

        expect(prerenderLink, 'to satisfy', {
            href: 'foo.bar'
        });
    });

    describe('when programmatically adding a relation', function () {
        it('should attach a link node in <head>', function () {
            const htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPrerenderLink',
                href: 'https://example.com/'
            }, 'firstInHead');
            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prerender" href="https://example.com/">');
        });

        it('should handle crossorigin url the same', function () {
            const htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPrerenderLink',
                to: new AssetGraph().addAsset({type: 'Html', text: '<!doctype html><html><head></head><body></body></html>', url: 'http://fisk.dk/index.html' }),
                as: 'script'
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prerender" href="http://fisk.dk/index.html">');
        });
    });
});

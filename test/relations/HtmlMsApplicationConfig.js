var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlMsApplicationConfig', function () {

    function getHtmlAsset(htmlString) {
        var graph = new AssetGraph({ root: __dirname });
        var htmlAsset = new AssetGraph.Html({
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });

        graph.addAsset(htmlAsset);

        return htmlAsset;
    }

    it('should handle a test case with an existing <meta name="msapplication-config" content="..."> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlMsApplicationConfig/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlMsApplicationConfig');
                expect(assetGraph, 'to contain asset', { fileName: 'IEconfig.xml' });
            })
            .run(done);
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlMsApplicationConfig/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlMsApplicationConfig');

                var relation = assetGraph.findRelations({ type: 'HtmlMsApplicationConfig' })[0];

                relation.to.url = 'foo.bar';

                expect(relation, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should register a relation when using attach', function () {

            return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlMsApplicationConfig/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    var previousRelation = assetGraph.findRelations({ type: 'HtmlMsApplicationConfig' })[0];

                    var relation = new AssetGraph.HtmlMsApplicationConfig({
                        to: new AssetGraph.Xml({ text: '', url: 'foo.xml' })
                    });

                    var htmlAsset = previousRelation.from;

                    relation.attach(htmlAsset, 'before', previousRelation);

                    expect(assetGraph.findRelations({}, true), 'to satisfy', [
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
        });

        it('should attach a link node in <head> when using attachToHead', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlMsApplicationConfig({
                to: new AssetGraph.Xml({ text: '', url: 'foo.xml' })
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<meta name="msapplication-config" content="foo.xml">');
        });
    });
});

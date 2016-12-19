var expect = require('../unexpected-with-plugins');
var sinon = require('sinon');
var AssetGraph = require('../../lib');

describe('tranforms/inlineCriticalCss', function () {
    it('should not do anything on an empty page', function () {
        var relations;
        var assets;

        return new AssetGraph({ root: __dirname + '/../../testdata/transforms/inlineCriticalCss/' })
            .loadAssets('empty.html')
            .populate()
            .queue(function (assetGraph) {
                relations = assetGraph.findRelations();
                assets = assetGraph.findAssets();
            })
            .inlineCriticalCss()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations(), 'to satisfy', relations);
                expect(assetGraph.findAssets(), 'to satisfy', assets);
            });
    });

    it('should emit a warning when encountering broken html', function () {
        var relations;
        var assets;

        var graph = new AssetGraph({ root: __dirname + '/../../testdata/transforms/inlineCriticalCss/' });
        var spy = sinon.spy();

        graph.on('warn', spy);

        return graph
            .loadAssets('missing-structure.html')
            .populate()
            .queue(function (assetGraph) {
                relations = assetGraph.findRelations();
                assets = assetGraph.findAssets();
            })
            .inlineCriticalCss()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations(), 'to satisfy', relations);
                expect(assetGraph.findAssets(), 'to satisfy', assets);

                expect(spy, 'to have calls satisfying', [
                    {
                        args: [
                            {
                                message: /Missing <html> and <head>/
                            }
                        ]
                    }
                ]);
            });
    });

    it('should inline the heading style of a simple test case', function () {
        return new AssetGraph({ root: __dirname + '/../../testdata/transforms/inlineCriticalCss/' })
            .loadAssets('simple.html')
            .populate()
            .inlineCriticalCss()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({ type: 'HtmlStyle' }), 'to satisfy', [
                    {
                        to: {
                            isInline: true,
                            text: 'h1 {\n    color: red\n}\na {\n    color: rebeccapurple\n}'
                        },
                        node: function (node) {
                            return node && node.parentNode && node.parentNode.tagName === 'HEAD';
                        }
                    },
                    {
                        to: {
                            fileName: 'simple.css'
                        }
                    }
                ]);
            });
    });

    it('should combine with other CSS transforms without throwing', function () {
        return new AssetGraph({ root: __dirname + '/../../testdata/transforms/inlineCriticalCss/' })
            .loadAssets('simple.html')
            .populate()
            .minifyAssets({isLoaded: true, isInline: false})
            .inlineHtmlTemplates()
            .bundleRelations({type: 'HtmlStyle', to: {type: 'Css', isLoaded: true}, node: function (node) {return !node.hasAttribute('nobundle');}})
            .inlineCriticalCss()
            .mergeIdenticalAssets({isLoaded: true, isInline: false, type: ['JavaScript', 'Css']}) // The bundling might produce several identical files, especially the 'oneBundlePerIncludingAsset' strategy.
            .minifyAssets({isLoaded: true})
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({ type: 'HtmlStyle' }), 'to satisfy', [
                    {
                        to: {
                            isInline: true,
                            text: 'h1{color:red}a{color:#639}'
                        },
                        node: function (node) {
                            return node && node.parentNode && node.parentNode.tagName === 'HEAD';
                        }
                    },
                    {
                        to: {
                            fileName: 'simple.css'
                        }
                    }
                ]);
            });
    });
});

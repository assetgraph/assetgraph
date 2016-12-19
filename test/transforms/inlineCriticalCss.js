var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

describe('tranforms/inlineCriticalCss', function () {
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
                            text: 'h1 {\n    color: red\n}'
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
                            text: 'h1{color:red}'
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

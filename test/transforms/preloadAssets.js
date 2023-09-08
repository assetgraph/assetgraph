/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/preloadAssets', function () {
    it('should add preload link tags to document if they do not exist', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/preloadAssets/'})
            .loadAssets('nolinks.html')
            .queue(function (assetGraph) {
                var html = assetGraph.findAssets({type: 'Html'})[0];

                expect(html.parseTree.querySelectorAll('link[rel="preload"]'), 'to satisfy', []);
            })
            .preloadAssets()
            .queue(function (assetGraph) {
                var html = assetGraph.findAssets({type: 'Html'})[0];

                expect(html.parseTree.querySelectorAll('link[rel="preload"]'), 'to satisfy', [
                    {
                        attributes: {
                            as: 'style',
                            href: 'bundle.css'
                        }
                    },
                    {
                        attributes: {
                            as: 'script',
                            href: 'bundle.js'
                        }
                    }
                ]);
            });
    });

    it('should not add preload link tags to document if they already exist', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/preloadAssets/'})
            .loadAssets('preexistinglinks.html')
            .queue(function (assetGraph) {
                var html = assetGraph.findAssets({type: 'Html'})[0];

                expect(html.parseTree.querySelectorAll('link[rel="preload"]'), 'to satisfy', [
                    {
                        attributes: {
                            as: 'style',
                            href: 'bundle.css'
                        }
                    },
                    {
                        attributes: {
                            as: 'script',
                            href: 'bundle.js'
                        }
                    }
                ]);
            })
            .preloadAssets()
            .queue(function (assetGraph) {
                var html = assetGraph.findAssets({type: 'Html'})[0];

                expect(html.parseTree.querySelectorAll('link[rel="preload"]'), 'to satisfy', [
                    {
                        attributes: {
                            as: 'style',
                            href: 'bundle.css'
                        }
                    },
                    {
                        attributes: {
                            as: 'script',
                            href: 'bundle.js'
                        }
                    }
                ]);
            });
    });
});

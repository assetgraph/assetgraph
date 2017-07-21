/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/addPushManifest', function () {
    it('should handle a page', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/addPushManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', { type: 'Json', fileName: 'push_mainfest.json' }, 0);
            })
            .addPushManifest()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', { type: 'Json', fileName: 'push_mainfest.json' }, 1);

                var pushManifest = assetGraph.findAssets({ type: 'Json', fileName: 'push_mainfest.json' })[0];

                expect(pushManifest.parseTree, 'to exhaustively satisfy', {
                    'index.html': {
                        'main.css': {
                            type: 'style',
                            weight: 1
                        },
                        'main.js': {
                            type: 'script',
                            weight: 1
                        },
                        'foo.png': {
                            type: 'image',
                            weight: 1
                        },
                        'bar.png': {
                            type: 'image',
                            weight: 1
                        }
                    }
                });
            });
    });
});

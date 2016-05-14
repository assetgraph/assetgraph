/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var sinon = require('sinon');
var AssetGraph = require('../../lib/');

describe('transforms/reviewSubResourceIntegrity', function () {
    describe('in update mode', function () {
        it('should add integrity attributes', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewSubResourceIntegrity/noExistingIntegrityAttributes/'})
                .loadAssets('index.html')
                .populate()
                .reviewSubResourceIntegrity(undefined, {update: true})
                .queue(function (assetGraph) {
                    var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                    expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="styles.css" integrity="sha256-NmwVoNxDfhvxYblUotdCNDR0dxxVfC95Ivfzd07A8Ho=">')
                        .and('to contain', '<script src="script.js" integrity="sha256-nQpZWy6FmDaPFB/EYnzBp+SsvapJs1xFaj+Vg+QbD+k=">');
                });
        });

        describe('with the algorithm option', function () {
            it('should add integrity attributes with that algorithm', function () {
                return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewSubResourceIntegrity/noExistingIntegrityAttributes/'})
                    .loadAssets('index.html')
                    .populate()
                    .reviewSubResourceIntegrity(undefined, {update: true, algorithm: 'sha384'})
                    .queue(function (assetGraph) {
                        var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                        expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="styles.css" integrity="sha384-//DlQsyF4pKdaiZy0Z+GeON6IcBfBV6uD30A7WoWOhApn7gTxaW1LIDesF3L/Kt8">')
                            .and('to contain', '<script src="script.js" integrity="sha384-u6RHBqMPTzcDT7MO27DcNHzIEovofdbFMbGqmMfkoIH2j+JeKVmO1FtA29NaI7Uk">');
                    });
            });
        });

        it('should leave existing integrity tokens alone', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewSubResourceIntegrity/existingIntegrityAttributes/'})
                .loadAssets('index.html')
                .populate()
                .reviewSubResourceIntegrity(undefined, {update: true})
                .queue(function (assetGraph) {
                    var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                    expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="styles.css" integrity="sha512-/17B+GMz2RvTlokFsMOh9oKDW4+ETBrX8RmQkCB2J8bfsrXE3CKEY+sdpU4FngOMhyTfznYSZHNO7BOkF/0vmQ== sha256-NmwVoNxDfhvxYblUotdCNDR0dxxVfC95Ivfzd07A8Ho=">')
                        .and('to contain', '<script src="script.js" integrity="sha512-wXenLCdTwtIg7nRmZzmxKmpUFFLgOLafZ7VkIlTq4qzWaLtxCyGePw44M18vetUNA8RoVobBLwIpFCKAaRgJ1g== sha256-nQpZWy6FmDaPFB/EYnzBp+SsvapJs1xFaj+Vg+QbD+k=">');
                });
        });

        describe('with single:true', function () {
            it('should warn and overwrite existing access tokens if they do not match', function () {
                var warnSpy = sinon.spy().named('warn');
                return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/'})
                    .on('warn', warnSpy)
                    .loadAssets('index.html')
                    .populate()
                    .reviewSubResourceIntegrity(undefined, {update: true, single: true})
                    .queue(function (assetGraph) {
                        var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                        expect(htmlAsset.text, 'to contain', '<link rel="stylesheet" href="styles.css" integrity="sha256-NmwVoNxDfhvxYblUotdCNDR0dxxVfC95Ivfzd07A8Ho=">')
                            .and('to contain', '<script src="script.js" integrity="sha256-nQpZWy6FmDaPFB/EYnzBp+SsvapJs1xFaj+Vg+QbD+k=">');
                        expect(warnSpy, 'to have calls satisfying', function () {
                            warnSpy(new Error('testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity hash does not match that of the linked resource (testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/styles.css) sha512-/12B+GMz2RvTlokFsMOh9oKDW4+ETBrX8RmQkCB2J8bfsrXE3CKEY+sdpU4FngOMhyTfznYSZHNO7BOkF/0vmQ=='));
                            warnSpy(new Error('testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity hash does not match that of the linked resource (testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/script.js) sha512-wXdnLCdTwtIg7nRmZzmxKmpUFFLgOLafZ7VkIlTq4qzWaLtxCyGePw44M18vetUNA8RoVobBLwIpFCKAaRgJ1g=='));
                        });
                    });
            });
        });
    });

    describe('in validate mode', function () {
        it('should complain about invalid hashes', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .reviewSubResourceIntegrity(undefined, {update: false})
                .queue(function () {
                    expect(warnSpy, 'to have calls satisfying', function () {
                        warnSpy(new Error('testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity attribute sha512-/12B+GMz2RvTlokFsMOh9oKDW4+ETBrX8RmQkCB2J8bfsrXE3CKEY+sdpU4FngOMhyTfznYSZHNO7BOkF/0vmQ== does not match the linked resource: testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/styles.css'));
                        warnSpy(new Error('testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity attribute sha512-wXdnLCdTwtIg7nRmZzmxKmpUFFLgOLafZ7VkIlTq4qzWaLtxCyGePw44M18vetUNA8RoVobBLwIpFCKAaRgJ1g== does not match the linked resource: testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/script.js'));
                    });
                });
        });

        it('should not complain when at least one hash is correct', function () {
            var warnSpy = sinon.spy().named('warn');
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/reviewSubResourceIntegrity/multipleHashes/'})
                .on('warn', warnSpy)
                .loadAssets('index.html')
                .populate()
                .reviewSubResourceIntegrity(undefined, {update: false})
                .queue(function () {
                    expect(warnSpy, 'to have calls satisfying', []);
                });
        });
    });
});

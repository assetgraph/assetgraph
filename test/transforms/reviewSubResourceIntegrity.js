const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/reviewSubResourceIntegrity', function() {
  describe('in update mode', function() {
    it('should add integrity attributes', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewSubResourceIntegrity/noExistingIntegrityAttributes/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewSubResourceIntegrity(undefined, { update: true });

      const htmlAsset = assetGraph.findAssets({ type: 'Html' })[0];
      expect(
        htmlAsset.text,
        'to contain',
        '<link rel="stylesheet" href="styles.css" integrity="sha256-NmwVoNxDfhvxYblUotdCNDR0dxxVfC95Ivfzd07A8Ho=">'
      ).and(
        'to contain',
        '<script src="script.js" integrity="sha256-nQpZWy6FmDaPFB/EYnzBp+SsvapJs1xFaj+Vg+QbD+k=">'
      );
    });

    describe('with the algorithm option', function() {
      it('should add integrity attributes with that algorithm', async function() {
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/transforms/reviewSubResourceIntegrity/noExistingIntegrityAttributes/'
          )
        });
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.reviewSubResourceIntegrity(undefined, {
          update: true,
          algorithm: 'sha384'
        });

        const htmlAsset = assetGraph.findAssets({ type: 'Html' })[0];
        expect(
          htmlAsset.text,
          'to contain',
          '<link rel="stylesheet" href="styles.css" integrity="sha384-//DlQsyF4pKdaiZy0Z+GeON6IcBfBV6uD30A7WoWOhApn7gTxaW1LIDesF3L/Kt8">'
        ).and(
          'to contain',
          '<script src="script.js" integrity="sha384-u6RHBqMPTzcDT7MO27DcNHzIEovofdbFMbGqmMfkoIH2j+JeKVmO1FtA29NaI7Uk">'
        );
      });
    });

    it('should leave existing integrity tokens alone', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewSubResourceIntegrity/existingIntegrityAttributes/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewSubResourceIntegrity(undefined, { update: true });

      const htmlAsset = assetGraph.findAssets({ type: 'Html' })[0];
      expect(
        htmlAsset.text,
        'to contain',
        '<link rel="stylesheet" href="styles.css" integrity="sha512-/17B+GMz2RvTlokFsMOh9oKDW4+ETBrX8RmQkCB2J8bfsrXE3CKEY+sdpU4FngOMhyTfznYSZHNO7BOkF/0vmQ== sha256-NmwVoNxDfhvxYblUotdCNDR0dxxVfC95Ivfzd07A8Ho=">'
      ).and(
        'to contain',
        '<script src="script.js" integrity="sha512-wXenLCdTwtIg7nRmZzmxKmpUFFLgOLafZ7VkIlTq4qzWaLtxCyGePw44M18vetUNA8RoVobBLwIpFCKAaRgJ1g== sha256-nQpZWy6FmDaPFB/EYnzBp+SsvapJs1xFaj+Vg+QbD+k=">'
      );
    });

    describe('with single:true', function() {
      it('should warn and overwrite existing access tokens if they do not match', async function() {
        const warnSpy = sinon.spy().named('warn');
        const assetGraph = new AssetGraph({
          root: pathModule.resolve(
            __dirname,
            '../../testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/'
          )
        });
        assetGraph.on('warn', warnSpy);
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.reviewSubResourceIntegrity(undefined, {
          update: true,
          single: true
        });

        const htmlAsset = assetGraph.findAssets({ type: 'Html' })[0];
        expect(
          htmlAsset.text,
          'to contain',
          '<link rel="stylesheet" href="styles.css" integrity="sha256-NmwVoNxDfhvxYblUotdCNDR0dxxVfC95Ivfzd07A8Ho=">'
        ).and(
          'to contain',
          '<script src="script.js" integrity="sha256-nQpZWy6FmDaPFB/EYnzBp+SsvapJs1xFaj+Vg+QbD+k=">'
        );
        expect(warnSpy, 'to have calls satisfying', () => {
          warnSpy(
            new Error(
              'testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity hash does not match that of the linked resource (testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/styles.css) sha512-/12B+GMz2RvTlokFsMOh9oKDW4+ETBrX8RmQkCB2J8bfsrXE3CKEY+sdpU4FngOMhyTfznYSZHNO7BOkF/0vmQ=='
            )
          );
          warnSpy(
            new Error(
              'testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity hash does not match that of the linked resource (testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/script.js) sha512-wXdnLCdTwtIg7nRmZzmxKmpUFFLgOLafZ7VkIlTq4qzWaLtxCyGePw44M18vetUNA8RoVobBLwIpFCKAaRgJ1g=='
            )
          );
        });
      });
    });
  });

  describe('in validate mode', function() {
    it('should complain about invalid hashes', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewSubResourceIntegrity(undefined, { update: false });

      expect(warnSpy, 'to have calls satisfying', () => {
        warnSpy(
          new Error(
            'testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity attribute sha512-/12B+GMz2RvTlokFsMOh9oKDW4+ETBrX8RmQkCB2J8bfsrXE3CKEY+sdpU4FngOMhyTfznYSZHNO7BOkF/0vmQ== does not match the linked resource: testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/styles.css'
          )
        );
        warnSpy(
          new Error(
            'testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/index.html: integrity attribute sha512-wXdnLCdTwtIg7nRmZzmxKmpUFFLgOLafZ7VkIlTq4qzWaLtxCyGePw44M18vetUNA8RoVobBLwIpFCKAaRgJ1g== does not match the linked resource: testdata/transforms/reviewSubResourceIntegrity/wrongExistingIntegrityAttributes/script.js'
          )
        );
      });
    });

    it('should not complain when at least one hash is correct', async function() {
      const warnSpy = sinon.spy().named('warn');
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/reviewSubResourceIntegrity/multipleHashes/'
        )
      });
      assetGraph.on('warn', warnSpy);
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      await assetGraph.reviewSubResourceIntegrity(undefined, { update: false });

      expect(warnSpy, 'to have calls satisfying', []);
    });
  });
});

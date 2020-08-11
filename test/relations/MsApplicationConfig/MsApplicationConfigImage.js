const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/MsApplicationConfigImage', async function () {
  it('should handle a test case with an existing <TileImage/> element', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/MsApplicationConfig/MsApplicationConfigImage/'
      ),
    });
    await assetGraph.loadAssets({
      type: 'MsApplicationConfig',
      url: 'IEconfig.xml',
    });
    await assetGraph.populate();

    expect(assetGraph.findRelations(), 'to satisfy', [
      { type: 'MsApplicationConfigImage' },
    ]);

    expect(assetGraph.findAssets(), 'to satisfy', [
      { type: 'MsApplicationConfig' },
      { fileName: 'icon.png' },
    ]);
  });

  it('should update the href', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/MsApplicationConfig/MsApplicationConfigImage/'
      ),
    });
    await assetGraph.loadAssets({
      type: 'MsApplicationConfig',
      url: 'IEconfig.xml',
    });
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage');

    const relation = assetGraph.findRelations({
      type: 'MsApplicationConfigImage',
    })[0];

    relation.to.url = 'foo.bar';

    expect(relation, 'to satisfy', {
      href: 'foo.bar',
    });
  });

  it('should inline an image', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/MsApplicationConfig/MsApplicationConfigImage/'
      ),
    });
    await assetGraph.loadAssets({
      type: 'MsApplicationConfig',
      url: 'IEconfig.xml',
    });
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage');

    const relation = assetGraph.findRelations({
      type: 'MsApplicationConfigImage',
    })[0];

    relation.inline();

    expect(relation, 'to satisfy', {
      href: expect.it('to begin with', 'data:image/png;base64,'),
    });
  });

  describe('when programmatically adding a relation', async function () {
    it('should throw when trying to attach', function () {
      const assetGraph = new AssetGraph();
      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        text: '<!doctype html><html><head></head><body></body></html>',
      });
      const image = assetGraph.addAsset({ type: 'Png', url: 'image.png' });

      expect(
        () =>
          htmlAsset.addRelation({
            type: 'MsApplicationConfigImage',
            to: image,
          }),
        'to throw',
        'MsApplicationConfigImage.attach: Not supported'
      );
    });
  });

  describe('when programmatically detaching a relation', async function () {
    it('it should remove the relation and clean up', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../../testdata/relations/MsApplicationConfig/MsApplicationConfigImage/'
        ),
      });
      await assetGraph.loadAssets({
        type: 'MsApplicationConfig',
        url: 'IEconfig.xml',
      });
      await assetGraph.populate();

      expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage', 1);

      const relation = assetGraph.findRelations({
        type: 'MsApplicationConfigImage',
      })[0];

      relation.detach();

      expect(assetGraph, 'to contain relation', 'MsApplicationConfigImage', 0);

      expect(
        assetGraph.findAssets({ type: 'MsApplicationConfig' })[0].text,
        'not to contain',
        '<TileImage'
      );
    });
  });
});

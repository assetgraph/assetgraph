const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/XmlSitemap', function() {
  describe('when loading a sitemap', function() {
    it('should find outgoing relations', async () => {
      const assetGraph = new AssetGraph({
        canonicalRoot: 'http://assetgraph.org',
        root: pathModule.resolve(
          __dirname,
          '../../testdata/assets/Xml/XmlSitemap'
        )
      });

      await assetGraph.loadAssets('sitemap.xml');
      await assetGraph.upgradeXmlSitemaps();
      await assetGraph.populate();

      expect(assetGraph, 'to contain asset', 'XmlSitemap');
      expect(assetGraph, 'to contain assets', 'Html', 2);
      expect(assetGraph, 'to contain relations', 'XmlSitemapUrl', 2);
    });
  });
});

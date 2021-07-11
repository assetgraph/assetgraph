const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../');
const sinon = require('sinon');

describe('assets/XmlSitemap', function () {

  describe('when the content of an Xml file contains a sitemap namespace', function() {
    const assetConfig = {
      url: 'http://example.com/sitemap.xml',
      contentType: 'text/xml',
      text: `<?xml version="1.0" encoding="UTF-8"?>

      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
         <url>
            <loc>http://example.com/landingpage.html</loc>
         </url>
      </urlset>
      `
    }

    it('should upgrade from Xml to XmlSitemap (more specific)', async function() {
      const assetGraph = new AssetGraph();
      const xmlAsset = assetGraph.addAsset(assetConfig);

      const infoSpy = sinon.spy().named('info');
      assetGraph.on('info', infoSpy);

      await xmlAsset.load();

      expect(assetGraph, 'to contain asset', 'XmlSitemap');
      expect(assetGraph, 'to contain no assets', 'Xml');
    });
  });

  describe('when loading a sitemap', function () {
    it('should find outgoing relations', async () => {
      const assetGraph = new AssetGraph({
        canonicalRoot: 'http://assetgraph.org',
        root: pathModule.resolve(__dirname, '../../testdata/assets/Xml/XmlSitemap')
      });

      await assetGraph.loadAssets('sitemap.xml').populate();

      expect(assetGraph, 'to contain asset', 'XmlSitemap');
      expect(assetGraph, 'to contain assets', 'Html', 2);
      expect(assetGraph, 'to contain relations', 'XmlSitemapUrl', 2);
    });
  });
})

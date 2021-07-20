const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');
const upgradeXmlSitemaps = require('../../lib/transforms/upgradeXmlSitemaps');

describe('transforms/upgradeXmlSitemaps', function() {
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
    };

    it('should upgrade from Xml to XmlSitemap', async function() {
      const assetGraph = new AssetGraph();
      const xmlAsset = assetGraph.addAsset(assetConfig);

      const infoSpy = sinon.spy().named('info');
      assetGraph.on('info', infoSpy);

      await xmlAsset.load();

      expect(assetGraph, 'to contain asset', 'Xml');
      expect(assetGraph, 'to contain no assets', 'XmlSitemap');

      await upgradeXmlSitemaps()(assetGraph);

      expect(assetGraph, 'to contain asset', 'XmlSitemap');
      expect(assetGraph, 'to contain no assets', 'Xml');
    });
  });
});

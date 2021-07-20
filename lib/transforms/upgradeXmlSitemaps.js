const XmlSitemap = require('../assets/XmlSitemap');

/** @typedef {import('../AssetGraph')} AssetGraph */
/** @typedef {import('../assets/Xml')} Xml */

/**
 *
 * @returns {(assetGraph: AssetGraph) => void}
 */
module.exports = () =>
  function upgradeXmlSitemaps(assetGraph) {
    /**
     * @type {Array<Xml>}
     */
    const potentialSitemaps = assetGraph.findAssets({ type: 'Xml' });

    for (const asset of potentialSitemaps) {
      const document = asset.parseTree;

      const urlset = document.querySelector('urlset');

      if (urlset) {
        const xmlns = urlset.getAttribute('xmlns');

        if (xmlns && xmlns.includes('sitemaps.org/schemas/sitemap')) {
          asset._upgrade(XmlSitemap);
        }
      }
    }
  };

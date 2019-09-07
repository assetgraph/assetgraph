const { promisify } = require('util');
const pMap = require('p-map');

module.exports = queryObj => {
  return async function gzip(assetGraph) {
    let compress;
    const gzipAssets = assetGraph.findAssets(
      Object.assign({ isInline: false }, queryObj)
    );

    if (gzipAssets.length > 0) {
      try {
        compress = require('node-zopfli');
      } catch (e) {
        assetGraph.info(
          new Error(
            'node-zopfli is not available, using less efficient zlib compression'
          )
        );
        compress = require('zlib');
      }
    }

    const gzip = promisify(compress.gzip.bind(compress));

    await pMap(
      gzipAssets,
      async asset => {
        // http://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
        if (asset.type !== 'SourceMap' && asset.rawSrc.length > 860) {
          const gzippedRawSrc = await gzip(asset.rawSrc);
          if (gzippedRawSrc.length < asset.rawSrc.length) {
            assetGraph.addAsset({
              url: asset.url.replace(/(?=[?#]|$)/, '.gz'),
              rawSrc: gzippedRawSrc
            });
          }
        }
      },
      { concurrency: 4 }
    );
  };
};

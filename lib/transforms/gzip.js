const Promise = require('bluebird');

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

    await Promise.map(
      gzipAssets,
      async asset => {
        // http://webmasters.stackexchange.com/questions/31750/what-is-recommended-minimum-object-size-for-gzip-performance-benefits
        if (asset.type !== 'SourceMap' && asset.rawSrc.length > 860) {
          const gzippedRawSrc = await Promise.fromNode(cb =>
            compress.gzip(asset.rawSrc, cb)
          );
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

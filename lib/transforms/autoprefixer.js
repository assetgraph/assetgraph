const semver = require('semver');

/**
 * autoprefixer transform
 *
 * - Runs autoprefixer with the supplied options on each css asset
 */
module.exports = (
  browsers,
  { sourceMaps = false, sourcesContent = false } = {}
) => {
  return function autoprefixer_(assetGraph) {
    const cssAssets = assetGraph.findAssets({ type: 'Css' });

    if (cssAssets.length > 0) {
      let autoprefixerVersionStr;
      try {
        autoprefixerVersionStr = require('autoprefixer/package.json').version;
      } catch (e) {
        e.message =
          `autoprefixer transform: Found ${
            cssAssets.length
          } css asset(s) while --browsers option is active, ` +
          `but no autoprefixer module is available. Please use npm to install autoprefixer in your project so ` +
          `the autoprefixer transform can require it.\n${e.message}`;
        throw e;
      }

      let autoprefixer;
      if (semver.satisfies(autoprefixerVersionStr, '>= 3.0.0')) {
        autoprefixer = require('autoprefixer')(browsers ? { browsers } : {});
      } else {
        autoprefixer = require('autoprefixer')(browsers);
      }

      const isAtLeastVersion5 = semver.satisfies(
        autoprefixerVersionStr,
        '>= 5.0.0'
      );
      let postcss;
      if (isAtLeastVersion5) {
        try {
          postcss = require('postcss');
        } catch (e) {
          postcss = require('autoprefixer/node_modules/postcss');
        }
      }
      for (const cssAsset of cssAssets) {
        try {
          if (isAtLeastVersion5) {
            let existingSourceMap = cssAsset.sourceMap;
            if (existingSourceMap && !existingSourceMap.mappings) {
              existingSourceMap = undefined;
            }

            const result = postcss(autoprefixer)
              .process(cssAsset.parseTree, {
                map: sourceMaps && {
                  inline: false,
                  annotation: false,
                  sourcesContent: sourcesContent
                }
              })
              .stringify();
            cssAsset.text = result.css;
            let sourceMap;
            if (sourceMaps && result.map) {
              sourceMap = result.map.toJSON();
              if (Array.isArray(sourceMap.sources)) {
                sourceMap.sources = sourceMap.sources.map(sourceUrl =>
                  sourceUrl
                    .replace(/^http:\/+/, 'http://')
                    .replace(/^file:\/*/, 'file:///')
                );
              }
              cssAsset.sourceMap = sourceMap;
            }
          } else {
            cssAsset.text = autoprefixer.process(cssAsset.text).css;
          }
        } catch (err) {
          err.asset = cssAsset;

          assetGraph.warn(err);
        }
      }
    }
  };
};

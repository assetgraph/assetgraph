module.exports = (queryObj) => {
  return async function minifySvgAssetsWithSvgo(assetGraph) {
    let svgo;
    const svgAssets = assetGraph.findAssets({ type: 'Svg', ...queryObj });
    if (svgAssets.length > 0) {
      try {
        svgo = require('svgo');
      } catch (e) {
        assetGraph.info(
          new Error(
            `minifySvgAssetsWithSvgo: Found ${svgAssets.length} svg asset(s), but no svgo module is available. Please use npm to install svgo in your project so minifySvgAssetsWithSvgo can require it.`
          )
        );
        return;
      }
      if (typeof svgo.optimize !== 'function') {
        assetGraph.info(
          new Error(
            `minifySvgAssetsWithSvgo: The svgo module was found, but it does not export an optimize function. Ensure that you've installed version 2.0.0 or above.`
          )
        );
        return;
      }
    }
    await Promise.all(
      svgAssets.map(async (svgAsset) => {
        // The removeUnknownsAndDefaults SVGO plugin strips top-level attributes of the <svg> element
        // that could be important. Note down all the attributes so they can be re-attached after the optimization
        // https://github.com/svg/svgo/issues/301
        const originalTopLevelAttributes = {};
        if (svgAsset.isInline) {
          for (const attribute of Array.from(
            svgAsset.parseTree.documentElement.attributes
          )) {
            originalTopLevelAttributes[attribute.name] = attribute.value;
          }
        }

        let result;
        try {
          result = svgo.optimize(svgAsset.text, {
            floatPrecision: 6, // The default of 2 is so low that it's visibly lossy in some cases
            plugins: [
              {
                name: 'preset-default',
                params: {
                  overrides: {
                    removeViewBox: false,
                  },
                },
              },
            ],
          });
        } catch (err) {
          assetGraph.warn(
            new Error(
              `SVG optimization error in ${svgAsset.urlOrDescription}\nOptimiztion skipped.\n${err}`
            )
          );
        }

        if (result) {
          svgAsset.text = result.data;
          if (svgAsset.isInline) {
            let dirty = false;
            for (const attributeName of Object.keys(
              originalTopLevelAttributes
            )) {
              if (
                !svgAsset.parseTree.documentElement.hasAttribute(attributeName)
              ) {
                svgAsset.parseTree.documentElement.setAttribute(
                  attributeName,
                  originalTopLevelAttributes[attributeName]
                );
                dirty = true;
              }
            }
            if (dirty) {
              svgAsset.markDirty();
            }
          }
        }
      })
    );
  };
};

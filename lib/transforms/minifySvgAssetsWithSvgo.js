const Promise = require('bluebird');

module.exports = queryObj => {
  return async function minifySvgAssetsWithSvgo(assetGraph) {
    let Svgo;
    const svgAssets = assetGraph.findAssets(
      Object.assign({ type: 'Svg' }, queryObj)
    );
    if (svgAssets.length > 0) {
      try {
        Svgo = require('svgo');
      } catch (e) {
        assetGraph.info(
          new Error(
            `minifySvgAssetsWithSvgo: Found ${
              svgAssets.length
            } svg asset(s), but no svgo module is available. Please use npm to install svgo in your project so minifySvgAssetsWithSvgo can require it.`
          )
        );
        return;
      }
    }
    await Promise.map(svgAssets, async svgAsset => {
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
        result = await new Svgo({
          floatPrecision: 6, // The default of 2 is so low that it's visibly lossy in some cases
          plugins: [{ removeViewBox: false }]
        }).optimize(svgAsset.text);
      } catch (err) {
        assetGraph.warn(
          new Error(
            `SVG optimization error in ${
              svgAsset.urlOrDescription
            }\nOptimiztion skipped.\n${err}`
          )
        );
      }

      if (result) {
        svgAsset.text = result.data;
        if (svgAsset.isInline) {
          let dirty = false;
          for (const attributeName of Object.keys(originalTopLevelAttributes)) {
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
    });
  };
};

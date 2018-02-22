const imageinfo = require('imageinfo');

module.exports = queryObj => {
  return function setHtmlImageDimensions(assetGraph) {
    for (const htmlImage of assetGraph.findRelations(
      Object.assign({ type: 'HtmlImage' }, queryObj)
    )) {
      if (
        !htmlImage.node.hasAttribute('height') &&
        !htmlImage.node.hasAttribute('width')
      ) {
        if (htmlImage.to) {
          if (htmlImage.to.type === 'Svg') {
            const svgElement = htmlImage.to.parseTree.documentElement;
            if (svgElement) {
              const intrinsicWidth = svgElement.getAttribute('width');
              if (
                intrinsicWidth &&
                /^\d+(?:\.\d+)?\s*(?:px)?\s*$/.test(intrinsicWidth)
              ) {
                htmlImage.node.setAttribute(
                  'width',
                  intrinsicWidth.replace(/\s*px\s*$/i, '')
                );
              }
              const intrinsicHeight = svgElement.getAttribute('height');
              if (
                intrinsicHeight &&
                /^\d+(?:\.\d+)?\s*(?:px)?\s*$/.test(intrinsicHeight)
              ) {
                htmlImage.node.setAttribute(
                  'height',
                  intrinsicHeight.replace(/\s*px\s*$/i, '')
                );
              }
            }
          } else {
            const info = imageinfo(htmlImage.to.rawSrc);
            if (info) {
              htmlImage.node.setAttribute('width', info.width);
              htmlImage.node.setAttribute('height', info.height);
              htmlImage.from.markDirty();
            }
          }
        }
      }
    }
  };
};

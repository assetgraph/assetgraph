var _ = require('lodash'),
    imageinfo = require('imageinfo');

module.exports = function (queryObj) {
    return function setHtmlImageDimensions(assetGraph) {
        assetGraph.findRelations(_.extend({type: 'HtmlImage'}, queryObj)).forEach(function (htmlImage) {
            if (!htmlImage.node.hasAttribute('height') && !htmlImage.node.hasAttribute('width')) {
                if (htmlImage.to) {
                    if (htmlImage.to.type === 'Svg') {
                        var svgElement = htmlImage.to.parseTree.documentElement;
                        if (svgElement) {
                            var intrinsicWidth = svgElement.getAttribute('width');
                            if (intrinsicWidth && /^\d+(?:\.\d+)?\s*(?:px)?\s*$/.test(intrinsicWidth)) {
                                htmlImage.node.setAttribute('width', intrinsicWidth.replace(/\s*px\s*$/i, ''));
                            }
                            var intrinsicHeight = svgElement.getAttribute('height');
                            if (intrinsicHeight && /^\d+(?:\.\d+)?\s*(?:px)?\s*$/.test(intrinsicHeight)) {
                                htmlImage.node.setAttribute('height', intrinsicHeight.replace(/\s*px\s*$/i, ''));
                            }
                        }
                    } else {
                        var info = imageinfo(htmlImage.to.rawSrc);
                        if (info) {
                            htmlImage.node.setAttribute('width', info.width);
                            htmlImage.node.setAttribute('height', info.height);
                            htmlImage.from.markDirty();
                        }
                    }
                }
            }
        });
    };
};

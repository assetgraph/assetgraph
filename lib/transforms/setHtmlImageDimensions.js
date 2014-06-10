var _ = require('lodash'),
    imageinfo = require('imageinfo');

module.exports = function (queryObj) {
    return function setHtmlImageDimensions(assetGraph) {
        assetGraph.findRelations(_.extend({type: 'HtmlImage'}, queryObj)).forEach(function (htmlImage) {
            if (!htmlImage.node.hasAttribute('height') && !htmlImage.node.hasAttribute('width')) {
                var info = htmlImage.to && imageinfo(htmlImage.to.rawSrc);
                if (info) {
                    htmlImage.node.setAttribute('width', info.width);
                    htmlImage.node.setAttribute('height', info.height);
                    htmlImage.from.markDirty();
                }
            }
        });
    };
};

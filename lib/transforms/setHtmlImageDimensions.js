var _ = require('underscore'),
    getImageInfoFromBuffers = require('../util/getImageInfoFromBuffers');

module.exports = function (queryObj) {
    return function setHtmlImageDimensions(assetGraph) {
        assetGraph.findRelations(_.extend({type: 'HtmlImage'}, queryObj)).forEach(function (htmlImage) {
            if (!htmlImage.node.hasAttribute('height') && !htmlImage.node.hasAttribute('width')) {
                var imageInfo = htmlImage.to && getImageInfoFromBuffers([htmlImage.to.rawSrc]);
                if (imageInfo) {
                    htmlImage.node.setAttribute('width', imageInfo.width);
                    htmlImage.node.setAttribute('height', imageInfo.height);
                    htmlImage.from.markDirty();
                }
            }
        });
    };
};

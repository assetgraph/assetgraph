var _ = require('underscore');

exports.pack = function (imageInfos) {
    var previousRightPadding = 0,
        packingData = {
            width: 0,
            height: 0,
            imageInfos: []
        };
    imageInfos.forEach(function (existingImageInfo) {
        var imageInfo = _.extend({}, existingImageInfo);
        packingData.width += Math.max(previousRightPadding, imageInfo.padding[3]);
        imageInfo.x = packingData.width;
        imageInfo.y = 0;
        packingData.width += imageInfo.width;
        previousRightPadding = imageInfo.padding[1];
        packingData.height = Math.max(packingData.height, imageInfo.height);
        packingData.imageInfos.push(imageInfo);
    });
    return packingData;
};

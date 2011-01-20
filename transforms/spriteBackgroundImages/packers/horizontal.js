exports.pack = function (imageInfos) {
    var height = 0,
        x = 0,
        previousRightPadding = 0;
    imageInfos.forEach(function (imageInfo) {
        x += Math.max(previousRightPadding, imageInfo.padding[3]);
        imageInfo.x = x;
        imageInfo.y = 0;
        x += imageInfo.width;
        previousRightPadding = imageInfo.padding[1];
        height = Math.max(height, imageInfo.height);
    });
    return {
        width: x,
        height: height
    };
};

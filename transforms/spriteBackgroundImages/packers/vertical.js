exports.pack = function (imageInfos) {
    var y = 0,
        width = 0,
        previousBottomPadding = 0;
    imageInfos.forEach(function (imageInfo) {
        y += Math.max(previousBottomPadding, imageInfo.padding[0]);
        imageInfo.y = y;
        imageInfo.x = 0;
        y += imageInfo.height;
        previousBottomPadding = imageInfo.padding[2];
        width = Math.max(width, imageInfo.width);
    });
    return {
        imageInfos: imageInfos,
        height: y,
        width: width
    };
};

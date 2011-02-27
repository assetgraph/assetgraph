var packers = ['./horizontal', './vertical', './jimScott'].map(require);

exports.pack = function (imageInfos) {
    var bestPacking;
    packers.forEach(function (packer) {
        var packing;
        try {
            packing = packer.pack(imageInfos);
        } catch (e) {
            // The Jim Scott packer doesn't support sprite padding, just skip to the next packer if we get an exception.
            return;
        }
        if (!bestPacking || (packing.width * packing.height) < (bestPacking.width * bestPacking.height)) {
            bestPacking = packing;
        }
    });
    return bestPacking;
};

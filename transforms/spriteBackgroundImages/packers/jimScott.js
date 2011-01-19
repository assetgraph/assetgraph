var _ = require('underscore');

/*
 * Very quick adaptation of http://pollinimini.net/blog/rectangle-packing-2d-packing
 * which is a JavaScript version of Jim Scott's original algorithm found
 * at http://www.blackpawn.com/texts/lightmaps/default.html
 *
 * It uses a binary tree to partition the space of the parent rectangle and allocate
 * the passed rectangles by dividing the partitions into filled and empty.
 */

function findCoords(node, width, height) {
    // If we are not at a leaf then go deeper
    if (node.lft) {
        // Check first the left branch if not found then go by the right
        return recursiveFindCoords(node.lft, width, height) || recursiveFindCoords(node.rgt, width, height);
    } else {
        // If already used or it's too big then return
        if (node.used || width > node.width || height > node.height) {
            return;
        }
    }
    // If it fits perfectly then use this gap
    if (width === node.width && height === node.height) {
        node.used = true;
        return {
            x: node.x,
            y: node.y
        };
    }

    // Initialize the left and right leaves by cloning the current one
    node.lft = _.extend({}, node);
    node.rgt = _.extend({}, node);

    // Checks if we partition in vertical or horizontal
    if (node.width - width > node.height - height) {
        node.lft.width = width;
        node.rgt.x = node.x + width;
        node.rgt.width = node.width - width;
    } else {
        node.lft.height = height;
        node.rgt.y = node.y + height;
        node.rgt.height = node.height - height;
    }
    return recursiveFindCoords(node.lft, width, height);
}

exports.pack = function (imageInfos, config) {
    config = config || {};
    var root = {
            x: 0,
            y: 0,
            width: config.maxWidth || 999999,
            height: config.maxHeight || 999999
        },
        packingWidth = 0,
        packingHeight = 0;

    imageInfos.forEach(function (imageInfo) {
        if (imageInfo.padding && imageInfo.padding.any(function (v) {return v > 0;})) {
            throw new Error("jimScott.pack: Sprite padding not supported");
        }
        // Perform the search
        var coords = recursiveFindCoords(root, imageInfo.width, imageInfo.height);
        // If fitted then recalculate the used dimensions
        if (coords) {
            packingWidth = Math.max(packingWidth, coords.x + imageInfo.width);
            packingHeight = Math.max(packingHeight, coords.y + imageInfo.height);
        } else {
            throw new Error("jimScott.pack: Cannot fit image");
        }
        _.extend(imageInfo, coords);
    });
    return {
        width: packingWidth,
        height: packingHeight
    };
};

var _ = require('underscore'),
    step = require('step'),
    Canvas = require('canvas'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

function calculateSpritePadding(paddingStr) {
    if (paddingStr) {
        // Strip units ('px' assumed)
        var tokens = [];
        paddingStr.split(/\s+/).forEach(function (token) {
            var num = parseInt(token.replace(/[a-z]+$/, ''), 10);
            if (!isNaN(num)) {
                tokens.push(num);
            }
        });
        if (tokens.length === 4) {
            return tokens;
        } else if (tokens.length === 3) {
            return [tokens[0], tokens[1], tokens[2], tokens[1]]; // T, L+R, B
        } else if (tokens.length === 2) {
            return [tokens[0], tokens[1], tokens[0], tokens[1]]; // T+B, L+R
        } else if (tokens.length === 1) {
            return [tokens[0], tokens[0], tokens[0], tokens[0]];
        }
    }
    return [0, 0, 0, 0];
}

function makeSprite(packingData, cb) {
    var canvas = new Canvas(packingData.width, packingData.height),
        ctx = canvas.getContext('2d');
    packingData.imageInfos.forEach(function (imageInfo) {
        ctx.drawImage(imageInfo.canvasImage, imageInfo.x, imageInfo.y, imageInfo.width, imageInfo.height);
    });
    canvas.toBuffer(cb);
}

exports.spriteBackgroundImages = function spriteBackgroundImages (siteGraph, cb) {
    var spriteGroups = {};
    siteGraph.relations.forEach(function (relation) {
        if (relation.type === 'CSSBackgroundImage') {
            var spriteInfo = assets.CSS.extractInfoFromRule(relation.cssRule, assets.CSS.vendorPrefix + '-sprite-'),
                asset = relation.to;
            if (spriteInfo.group) {
                var spriteGroup = spriteGroups[spriteInfo.group];
                if (!spriteGroup) {
                    spriteGroup = spriteGroups[spriteInfo.group] = {};
                }
                var imageInfo = spriteGroup[asset.id],
                    padding = calculateSpritePadding(spriteInfo.padding);
                if (!imageInfo) {
                    imageInfo = spriteGroup[asset.id] = {
                        padding: padding,
                        asset: asset,
                        relations: [relation]
                    };
                } else {
                    imageInfo.relations.push(relation);
                    for (var i = 0 ; i < 4 ; i += 1) {
                        imageInfo.padding[i] = Math.max(padding[i], imageInfo.padding[i]);
                    }
                }
            }
        }
    });

    _.each(spriteGroups, function (spriteGroup, spriteGroupName) {
        var imageInfos = _.values(spriteGroup);
        step(
            function () {
                var group = this.group();
                imageInfos.forEach(function (imageInfo) {
                    imageInfo.asset.getCanvasImage(group());
                });
            },
            error.passToFunction(cb, function (canvasImages) {
                canvasImages.forEach(function (canvasImage, i) {
                    _.extend(imageInfos[i], {
                        canvasImage: canvasImage,
                        width: canvasImage.width,
                        height: canvasImage.height
                    });
                });
                makeSprite(require('./spriteBackgroundImages/packers/horizontal').pack(imageInfos), this);
            }),
            error.passToFunction(cb, function (spriteBuffer) {
                var spriteAsset = new assets.PNG({
                    originalSrc: spriteBuffer
                });
                siteGraph.registerAsset(spriteAsset);
                imageInfos.forEach(function (imageInfo) {
                    imageInfo.relations.forEach(function (relation) {
                        var newRelation = new relations.CSSBackgroundImage({
                            cssRule: relation.cssRule,
                            propertyName: relation.propertyName,
                            from: relation.from,
                            to: spriteAsset
                        });
                        newRelation.cssRule['background-position'] =
                            (imageInfo.x ? (-imageInfo.x) + "px " : "0 ") + (imageInfo.y ? -imageInfo.y + "px" : "0");

                        siteGraph.registerRelation(newRelation, 'before', relation);
                        siteGraph.unregisterRelation(relation);
                        if (siteGraph.assetIsOrphan(relation.to)) {
                            siteGraph.unregisterAsset(relation.to);
                        }
                    });
                });
                cb();
            })
        );
    });
};

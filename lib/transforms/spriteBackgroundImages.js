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

exports.spriteBackgroundImages = function () {
    return function spriteBackgroundImages(assetGraph, cb) {
        var spriteGroups = {};
        assetGraph.relations.forEach(function (relation) {
            if (relation.type === 'CSSBackgroundImage') {
                var spriteInfo = assets.CSS.extractInfoFromRule(relation.cssRule, assets.CSS.vendorPrefix + '-sprite-'),
                    asset = relation.to;
                if (spriteInfo.group) {
                    var spriteGroup = spriteGroups[spriteInfo.group];
                    if (!spriteGroup) {
                        spriteGroup = spriteGroups[spriteInfo.group] = {
                            imageInfosById: {}
                        };
                    }
                    var imageInfo = spriteGroup[asset.id],
                        padding = calculateSpritePadding(spriteInfo.padding);
                    if (!imageInfo) {
                        imageInfo = spriteGroup.imageInfosById[asset.id] = {
                            padding: padding,
                            asset: asset,
                            incomingRelations: [relation]
                        };
                    } else {
                        imageInfo.incomingRelations.push(relation);
                        for (var i = 0 ; i < 4 ; i += 1) {
                            imageInfo.padding[i] = Math.max(padding[i], imageInfo.padding[i]);
                        }
                    }
                }
            }
        });

        // Find the sprite configurations (if any):
        assetGraph.findRelations('type', 'CSSSpritePlaceholder').forEach(function (cssSpritePlaceholder) {
            // TODO: Emit a warning if the sprite configuration selector won't be reachable
            var spriteGroupName = cssSpritePlaceholder.to.originalSrc.selectorForGroup; // Eeh
            if (spriteGroupName in spriteGroups) {
                spriteGroups[spriteGroupName].cssSpritePlaceholder = cssSpritePlaceholder;
            }
        });

        _.each(spriteGroups, function (spriteGroup, spriteGroupName) {
            var imageInfos = _.values(spriteGroup.imageInfosById),
                spriteInfo = spriteGroup.cssSpritePlaceholder ? spriteGroup.cssSpritePlaceholder.to.originalSrc : {};
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

                    var packerName = {
                        'jim-scott': 'jimScott',
                        horizontal: 'horizontal'
                    }[spriteInfo.packer] || 'vertical';
                    var packingData = require('./spriteBackgroundImages/packers/' + packerName).pack(imageInfos),
                        canvas = new Canvas(packingData.width, packingData.height),
                        ctx = canvas.getContext('2d');
                    if ('backgroundColor' in spriteInfo) {
                        ctx.fillStyle = spriteInfo.imageBackgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    imageInfos.forEach(function (imageInfo) {
                        ctx.drawImage(imageInfo.canvasImage, imageInfo.x, imageInfo.y, imageInfo.width, imageInfo.height);
                    });
                    canvas.toBuffer(this);
                }),
                error.passToFunction(cb, function (spriteBuffer) {
                    var spriteAsset = new assets.PNG({
                        originalSrc: spriteBuffer
                    });
                    assetGraph.registerAsset(spriteAsset);
                    if (spriteGroup.cssSpritePlaceholder) {
                        spriteGroup.cssSpritePlaceholder.cssRule.style.setProperty('background-image', 'url(thething.png)'); // Not necessary, is it?
                        assetGraph.registerRelation(new relations.CSSBackgroundImage({
                            cssRule: spriteGroup.cssSpritePlaceholder.cssRule,
                            propertyName: 'background-image',
                            from: spriteGroup.cssSpritePlaceholder.from,
                            to: spriteAsset
                        }), 'before', spriteGroup.cssSpritePlaceholder);
                        assetGraph.detachAndUnregisterRelation(spriteGroup.cssSpritePlaceholder);
                        assetGraph.unregisterAsset(spriteGroup.cssSpritePlaceholder.to);
                    }
                    imageInfos.forEach(function (imageInfo) {
                        imageInfo.incomingRelations.forEach(function (incomingRelation) {
                            var relationSpriteInfo = assets.CSS.extractInfoFromRule(incomingRelation.cssRule, assets.CSS.vendorPrefix + '-sprite-');
                            incomingRelation.cssRule.style.setProperty('background-position',
                                                                       (imageInfo.x ? (-imageInfo.x) + "px " : "0 ") +
                                                                       (imageInfo.y ? -imageInfo.y + "px" : "0"));
                            ['group', 'padding', 'no-group-selector'].forEach(function (propertyName) {
                                incomingRelation.cssRule.style.removeProperty(assets.CSS.vendorPrefix + '-sprite-' + propertyName);
                            }, this);
                            if (relationSpriteInfo.noGroupSelector) {
                                // The user specified the this selector needs its own background-image / background
                                // property pointing at the sprite rather than relying on the HTML elements also being
                                // matched by the sprite group's "main" selector, which would have been preferable.
                                assetGraph.registerRelation(new relations.CSSBackgroundImage({
                                    cssRule: incomingRelation.cssRule,
                                    propertyName: incomingRelation.propertyName,
                                    from: incomingRelation.from,
                                    to: spriteAsset
                                }), 'before', incomingRelation);
                                assetGraph.unregisterRelation(incomingRelation);
                            } else {
                                assetGraph.detachAndUnregisterRelation(incomingRelation);
                            }
                            if (assetGraph.assetIsOrphan(incomingRelation.to)) {
                                assetGraph.unregisterAsset(incomingRelation.to);
                            }
                        });
                    });

                    process.nextTick(cb);
                })
            );
        });
    };
};

var _ = require('underscore'),
    seq = require('seq'),
    Canvas = require('canvas'),
    passError = require('../util/passError'),
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

module.exports = function () {
    return function spriteBackgroundImages(assetGraph, cb) {
        // Waiting for https://github.com/LearnBoost/node-canvas/issues/52
        var cairoVersion = Canvas.cairoVersion.split(".").map(function (str) {return parseInt(str, 10);});
        if (cairoVersion[0] < 1 || cairoVersion[1] < 10) {
            console.warn("transforms.spriteBackgroundImages: Cannot create sprites due to missing canvas.getContext('2d').drawImage() support. Please compile node-canvas with Cairo version 1.10.0 or above.");
            return cb();
        }

        var spriteGroups = {};
        assetGraph.findRelations({type: 'CssImage'}).forEach(function (relation) {
            var spriteInfo = assets.Css.extractInfoFromRule(relation.cssRule, assets.Css.vendorPrefix + '-sprite-'),
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
        });

        seq.ap(assetGraph.findAssets({type: 'Css'}))
            .parEach(function (cssAsset) {
                cssAsset.getParseTree(this);
            })
            .parEach(function (cssAsset) {
                assets.Css.eachRuleInParseTree(cssAsset.parseTree, function (cssRule) {
                    if ((assets.Css.vendorPrefix + '-sprite-selector-for-group') in cssRule.style) {
                        var spriteInfo = assets.Css.extractInfoFromRule(cssRule, assets.Css.vendorPrefix + '-sprite-'),
                            spriteGroupName = spriteInfo.selectorForGroup;
                        if (spriteGroupName in spriteGroups) {
                            if (spriteGroups[spriteGroupName].placeHolder) {
                                console.warn("spriteBackgroundImages: Multiple definitions of " + spriteGroupName + " sprite");
                            }
                            spriteGroups[spriteGroupName].placeHolder = _.extend(spriteInfo, {
                                asset: cssAsset,
                                cssRule: cssRule
                            });
                        }
                    }
                });
                this();
            })
            .set(_.keys(spriteGroups))
            .flatten()  // https://github.com/substack/node-seq/pull/9
            .seqEach(function (spriteGroupName) {
                var callback = this,
                    spriteGroup = spriteGroups[spriteGroupName],
                    imageInfos = _.values(spriteGroup.imageInfosById),
                    spriteInfo = spriteGroup.placeHolder ? spriteGroup.placeHolder : {};

                seq.ap(imageInfos)
                    .parMap(function (imageInfo) {
                        imageInfo.asset.getCanvasImage(this);
                    })
                    .seqEach(function (canvasImage, i) {
                        _.extend(imageInfos[i], {
                            canvasImage: canvasImage,
                            width: canvasImage.width,
                            height: canvasImage.height
                        });
                        process.nextTick(this);
                    })
                    .seq(function () {
                        var packerName = {
                            'jim-scott': 'jimScott',
                            horizontal: 'horizontal',
                            vertical: 'vertical'
                        }[spriteInfo.packer] || 'tryAll';
                        var packingData = require('./spriteBackgroundImages/packers/' + packerName).pack(imageInfos),
                            canvas = new Canvas(packingData.width, packingData.height),
                            ctx = canvas.getContext('2d');
                        imageInfos = packingData.imageInfos;
                        if ('backgroundColor' in spriteInfo) {
                            ctx.fillStyle = spriteInfo.imageBackgroundColor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                        imageInfos.forEach(function (imageInfo) {
                            ctx.drawImage(imageInfo.canvasImage, imageInfo.x, imageInfo.y, imageInfo.width, imageInfo.height);
                        });
                        canvas.toBuffer(this);
                    })
                    .seq(function (spriteBuffer) {
                        var spriteAsset = new assets.Png({
                            rawSrc: spriteBuffer
                        });
                        spriteAsset.url = assetGraph.root + spriteAsset.id + spriteAsset.defaultExtension; // FIXME
                        assetGraph.addAsset(spriteAsset);
                        if (spriteGroup.placeHolder) {
                            var cssRule = spriteGroup.placeHolder.cssRule,
                                relation = new relations.CssImage({
                                    cssRule: cssRule,
                                    propertyName: 'background-image',
                                    from: spriteGroup.placeHolder.asset,
                                    to: spriteAsset
                                });
                            cssRule.style.setProperty('background-image', 'url(...)',
                                                      spriteGroup.placeHolder.important && 'important');
                            // I can't see why the ordering of CssImage relations should be significant...
                            assetGraph.addRelation(relation, 'last');
                            assetGraph.refreshRelationUrl(relation);
                            ['selector-for-group', 'packer', 'image-format', 'background-color'].forEach(function (propertyName) {
                                spriteGroup.placeHolder.cssRule.style.removeProperty(assets.Css.vendorPrefix + '-sprite-' + propertyName);
                            });
                        }
                        imageInfos.forEach(function (imageInfo) {
                            imageInfo.incomingRelations.forEach(function (incomingRelation) {
                                assetGraph.markAssetDirty(incomingRelation.from);
                                var relationSpriteInfo = assets.Css.extractInfoFromRule(incomingRelation.cssRule, assets.Css.vendorPrefix + '-sprite-');
                                incomingRelation.cssRule.style.setProperty('background-position',
                                                                           (imageInfo.x ? (-imageInfo.x) + "px " : "0 ") +
                                                                           (imageInfo.y ? -imageInfo.y + "px" : "0"),
                                                                           relationSpriteInfo.important && 'important');
                                ['group', 'padding', 'no-group-selector', 'important'].forEach(function (propertyName) {
                                    incomingRelation.cssRule.style.removeProperty(assets.Css.vendorPrefix + '-sprite-' + propertyName);
                                }, this);
                                if (relationSpriteInfo.noGroupSelector) {
                                    // The user specified that this selector needs its own background-image/background
                                    // property pointing at the sprite rather than relying on the Html elements also being
                                    // matched by the sprite group's "main" selector, which would have been preferable.
                                    var relation = new relations.CssImage({
                                        cssRule: incomingRelation.cssRule,
                                        propertyName: incomingRelation.propertyName,
                                        from: incomingRelation.from,
                                        to: spriteAsset
                                    });
                                    assetGraph.addRelation(relation, 'before', incomingRelation);
                                    assetGraph.refreshRelationUrl(relation);
                                    assetGraph.removeRelation(incomingRelation);
                                } else {
                                    assetGraph.detachAndRemoveRelation(incomingRelation);
                                }

                                // Remove the original image if it has become an orphan:
                                if (!assetGraph.findRelations({to: incomingRelation.to}).length) {
                                    assetGraph.removeAsset(incomingRelation.to);
                                }
                            });
                        });
                        callback();
                    })
                    ['catch'](callback);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};

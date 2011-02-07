var child_process = require('child_process'),
    _ = require('underscore'),
    step = require('step'),
    error = require('../error'),
    assets = require('../assets'),
    relations = require('../relations');

exports.addPNG8FallbackForIE6 = function () {
    return function addPNG8FallbackForIE6(assetGraph, cb) {
        var imageInfosById = {};
        assetGraph.findRelations({
            type: 'CSSBackgroundImage',
            to: {type: 'PNG'}
        }).forEach(function (cssBackgroundImage) {
            if (cssBackgroundImage.cssRule.style[assets.CSS.vendorPrefix + '-image-pngquant']) {
                if (/^_/.test(cssBackgroundImage.propertyName)) {
                    console.log("addPNG8FallbackForIE6: Skipping " + cssBackgroundImage.propertyName);
                } else if (('_' + cssBackgroundImage.propertyName) in cssBackgroundImage.cssRule.style) {
                    console.log("addPNG8FallbackForIE6: Underscore hack already in use");
                } else {
                    if (!(cssBackgroundImage.to.id in imageInfosById)) {
                        imageInfosById[cssBackgroundImage.to.id] = {
                            asset: cssBackgroundImage.to,
                            incomingRelations: []
                        };
                    }
                    imageInfosById[cssBackgroundImage.to.id].incomingRelations.push(cssBackgroundImage);
                }
            }
        });

        var imageInfos = _.values(imageInfosById);
        if (!imageInfos.length) {
            return cb(null, assetGraph);
        }
        step(
            function () {
                var group = this.group();
                imageInfos.forEach(function (imageInfo) {
                    imageInfo.asset.serialize(group());
                });
            },
            error.passToFunction(cb, function (imageSrcs) {
                var group = this.group();
                imageInfos.forEach(function (imageInfo, i) {
                    imageInfo.srcBefore = imageSrcs[i];
                    var pngQuant = child_process.spawn('pngquant', ['256']),
                        callback = group(),
                        buffer = '';
                    pngQuant.stdout.setEncoding('binary');
                    pngQuant.stdout.on('data', function (chunk) {
                        buffer += chunk;
                    }).on('end', function () {
                        callback(null, buffer);
                    }).on('error', callback);
                    pngQuant.stdin.write(imageSrcs[i], 'binary');
                });
            }),
            error.passToFunction(cb, function (pngQuantedImageSrcs) {
                imageInfos.forEach(function (imageInfo, i) {
                    var pngQuantedAsset = new assets.PNG({
                        originalSrc: pngQuantedImageSrcs[i]
                    });
                    assetGraph.addAsset(pngQuantedAsset);
                    imageInfo.incomingRelations.forEach(function (incomingRelation) {
                        if (/\bie6\b/.test(incomingRelation.cssRule.style[assets.CSS.vendorPrefix + '-image-pngquant'])) {
                            // Designates that the pngquanted image should only be used in IE6
                            // Keep the original relation and use the underscore hack for getting
                            // IE6 to fetch the pngquanted version:
                            assetGraph.addRelation(new relations.CSSBackgroundImage({
                                propertyName: '_' + incomingRelation.propertyName,
                                cssRule: incomingRelation.cssRule,
                                from: incomingRelation.from,
                                to: pngQuantedAsset
                            }), 'after', incomingRelation);
                        } else {
                            // -one-image-pngquant: true/all/whatever:
                            // All browsers should see the pngquanted version, replace the old relation:
                            assetGraph.addRelation(new relations.CSSBackgroundImage({
                                propertyName: incomingRelation.propertyName,
                                cssRule: incomingRelation.cssRule,
                                from: incomingRelation.from,
                                to: pngQuantedAsset
                            }), 'after', incomingRelation);
                            assetGraph.detachAndRemoveRelation(incomingRelation);
                        }
                    });
                    // Remove original asset if it has become orphaned:
                    if (!assetGraph.findRelations({to: imageInfo.asset}).length) {
                        assetGraph.removeAsset(imageInfo.asset);
                    }
                });
                process.nextTick(cb);
            })
        );
    };
};

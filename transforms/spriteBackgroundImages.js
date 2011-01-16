var _ = require('underscore'),
    step = require('step'),
    Canvas = require('canvas'),
    error = require('../error');

var vendorPrefix = '-one';

function extractHashFromCSSRule(cssRule, propertyNamePrefix) {
    var result = {};
    for (var i = 0 ; i < cssRule.style.length ; i += 1) {
        var propertyName = cssRule.style[i];
        if (propertyName.indexOf(propertyNamePrefix) === 0) {
            var keyName = propertyName.substr(propertyNamePrefix.length).replace(/-([a-z])/, function ($0, $1) {
                return $1.toUpperCase();
            });
            result[keyName] = cssRule.style[propertyName].replace(/^([\'\"])(.*)\1$/, "$2");
        }
    }
    return result;
}

exports.spriteBackgroundImages = function spriteBackgroundImages (siteGraph, cb) {
    var spriteGroups = {};
    siteGraph.relations.forEach(function (relation) {
        if (relation.type === 'CSSBackgroundImage') {
            var spriteGroup = relation.cssRule.style[vendorPrefix + '-sprite-group'];
            if (spriteGroup) {
                if (!(spriteGroup in spriteGroups)) {
                    spriteGroups[spriteGroup] = [];
                }
                spriteGroups[spriteGroup].push(relation);
            }
        }
    });

//    console.log("These are the sprite groups: " + require('sys').inspect(spriteGroups, false, 2));

    _.each(spriteGroups, function (cssBackgroundImages, spriteGroupName) {
//        console.log("Spriting " + spriteGroupName + " (" + cssBackgroundImages.length + " images)");

        var imageOccurrences = {};
        cssBackgroundImages.forEach(function (cssBackgroundImage) {
            var assetId = cssBackgroundImage.to.id;
            (imageOccurrences[assetId] = imageOccurrences[assetId] || []).push(cssBackgroundImage);
        });

        _.each(imageOccurrences, function (cssBackgroundImages, assetId) {
            // find max padding
        });


        step(
            function () {
                var group = this.group();
                cssBackgroundImages.forEach(function (cssBackgroundImage) {
                    cssBackgroundImage.to.getCanvasImage(group());
                });
            },
            function (err, canvasImages) {
                console.log("Got the images " + canvasImages.length + " and the err=" + err);
            },
            cb
        );
    });
};

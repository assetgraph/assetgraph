var _ = require('underscore'),
    relations = require('../relations'),
    assets = require('../assets');

// Inlines images in Css as data: urls if
//   the CSS rule containing the background/background-image property also has a "-one-image-inline: inline" property
//   OR the size of the image is less than or equal to 'sizeThreshold' AND the Css asset only has that one relation to the image
//
// Note: If provided, the queryObj argument must specify the set of Html assets to start from so that a fallback IE stylesheet can be created.

module.exports = function (queryObj, sizeThreshold) {
    return function inlineCssImagesWithLegacyFallback(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                var cssAsset = htmlStyle.to,
                    cssImages = assetGraph.findRelations({from: cssAsset, to: {isImage: true, isInline: false}}),
                    cssImagesToInline = [];
                cssImages.forEach(function (cssImage) {
                    if (cssImage.cssRule.style.getPropertyValue('-one-image-inline') ||
                        (sizeThreshold >= 0 && cssImage.to.rawSrc.length <= sizeThreshold) && assetGraph.findRelations({from: cssAsset, to: cssImage.to}).length === 1) {

                        cssImagesToInline.push(cssImage);
                    }
                });
                if (cssImagesToInline.length > 0) {
                    var document = htmlAsset.parseTree,
                        conditionalCommentBody = new assets.Html({text: ""});

                    assetGraph.addAsset(conditionalCommentBody);
                    assetGraph.attachAndAddRelation(new relations.HtmlConditionalComment({
                        from: htmlAsset,
                        to: conditionalCommentBody,
                        condition: "IE"
                    }), 'before', htmlStyle);

                    var htmlStyleInConditionalComment = new relations.HtmlStyle({
                        from: conditionalCommentBody
                    });
                    htmlStyleInConditionalComment.attach(conditionalCommentBody, 'first');

                    var legacyStyleSheet = cssAsset.clone(htmlStyleInConditionalComment);

                    htmlStyleInConditionalComment.refreshHref();
                    // FIXME: Maybe a not-IE conditional comment should also be modelled as an inline-ish Html asset?
                    htmlStyle.node.parentNode.insertBefore(document.createComment("[if !IE]>"), htmlStyle.node);
                    if (htmlStyle.node.nextSibling) {
                        htmlStyle.node.parentNode.insertBefore(document.createComment("<![endif]"), htmlStyle.node.nextSibling);
                    } else {
                        htmlStyle.node.parentNode.appendChild(document.createComment("<![endif]"));
                    }
                    cssImagesToInline.forEach(function (cssImage) {
                        cssImage.inline();
                    });
                }
            });
        });
    };
};

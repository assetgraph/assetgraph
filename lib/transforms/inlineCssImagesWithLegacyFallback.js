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
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                var cssAsset = htmlStyle.to,
                    cssImages = assetGraph.findRelations({from: cssAsset, to: {isImage: true, isInline: false}}),
                    hasCssImagesToInline = false;
                cssImages.forEach(function (cssImage) {
                    if (cssImage.cssRule.style.getPropertyValue('-one-image-inline') ||
                        sizeThreshold >= 0 && cssImage.to.rawSrc.length <= sizeThreshold && assetGraph.findRelations({from: cssAsset, to: cssImage.to}).length === 1) {

                        hasCssImagesToInline = true;
                    }
                });
                if (hasCssImagesToInline > 0) {
                    var document = htmlAsset.parseTree,
                        internetExplorerConditionalCommentBody = new assets.Html({text: ""}),
                        nonInternetExplorerConditionalCommentBody = new assets.Html({text: ""});

                    assetGraph.addAsset(internetExplorerConditionalCommentBody);
                    assetGraph.addAsset(nonInternetExplorerConditionalCommentBody);

                    new relations.HtmlConditionalComment({
                        to: internetExplorerConditionalCommentBody,
                        condition: 'IE'
                    }).attach(htmlAsset, 'before', htmlStyle);

                    var htmlStyleInInternetExplorerConditionalComment = new relations.HtmlStyle({to: cssAsset});
                    htmlStyleInInternetExplorerConditionalComment.attach(internetExplorerConditionalCommentBody, 'first');

                    new relations.HtmlConditionalComment({
                        to: nonInternetExplorerConditionalCommentBody,
                        condition: '!IE'
                    }).attach(htmlAsset, 'before', htmlStyle);

                    var htmlStyleInNonInternetExplorerConditionalComment = new relations.HtmlStyle({to: cssAsset});
                    htmlStyleInNonInternetExplorerConditionalComment.attach(nonInternetExplorerConditionalCommentBody, 'first');
                    var cssAssetClone = cssAsset.clone(htmlStyleInNonInternetExplorerConditionalComment);

                    var media = htmlStyle.node.getAttribute('media');
                    if (media) {
                        htmlStyleInInternetExplorerConditionalComment.node.setAttribute('media', media);
                        htmlStyleInNonInternetExplorerConditionalComment.node.setAttribute('media', media);
                        internetExplorerConditionalCommentBody.markDirty();
                        nonInternetExplorerConditionalCommentBody.markDirty();
                    }

                    htmlStyle.detach();

                    assetGraph.findRelations({from: cssAssetClone}).forEach(function (cssImage) {
                        if (cssImage.cssRule.style.getPropertyValue('-one-image-inline')) {
                            cssImage.cssRule.style.removeProperty('-one-image-inline');
                            cssAssetClone.markDirty();
                            cssImage.inline();
                        } else if (sizeThreshold >= 0 && cssImage.to.rawSrc.length <= sizeThreshold && assetGraph.findRelations({from: cssAsset, to: cssImage.to}).length === 1) {
                            cssImage.inline();
                        }
                    });
                }
            });
        });
    };
};

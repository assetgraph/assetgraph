var _ = require('underscore'),
    relations = require('../relations'),
    assets = require('../assets');

// Inlines images in Css as data: urls if
//   the CSS rule containing the background/background-image property also has a "-ag-image-inline: inline" property
//   OR the size of the image is less than or equal to 'sizeThreshold' AND the Css asset only has that one relation to the image
//
// Note: If provided, the queryObj argument must specify the set of Html assets to start from so that a fallback IE stylesheet can be created.

module.exports = function (queryObj, sizeThreshold) {
    return function inlineCssImagesWithLegacyFallback(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                var cssAsset = htmlStyle.to,
                    cssImages = assetGraph.findRelations({type: 'CssImage', from: cssAsset, to: {isImage: true, isInline: false}}),
                    ieVersion = 8,
                    hasCssImagesToInline = false;
                cssImages.forEach(function (cssImage) {
                    if (/\?(?:|[^#]*&)inline(?:[#&]|$)/.test(cssImage.to.url) ||
                        (!/^_/.test(cssImage.propertyName) && // Underscore hack (IE6), don't inline
                         sizeThreshold >= 0 &&
                         cssImage.to.rawSrc.length <= sizeThreshold &&
                         assetGraph.findRelations({from: cssAsset, to: cssImage.to}).length === 1)) {

                        hasCssImagesToInline = true;
                        if (cssImage.to.rawSrc.length > 32 * 1024) {
                            ieVersion = 9; // IE 8 doesn't support data URLs > 32 KB
                        }
                    }
                });
                if (hasCssImagesToInline) {
                    var document = htmlAsset.parseTree,
                        internetExplorerConditionalCommentBody = new assets.Html({text: ""});

                    assetGraph.addAsset(internetExplorerConditionalCommentBody);

                    new relations.HtmlConditionalComment({
                        to: internetExplorerConditionalCommentBody,
                        condition: 'lt IE ' + ieVersion
                    }).attach(htmlAsset, 'before', htmlStyle);
                    var htmlStyleInInternetExplorerConditionalComment = new relations.HtmlStyle({to: cssAsset});
                    htmlStyleInInternetExplorerConditionalComment.attach(internetExplorerConditionalCommentBody, 'first');

                    var parentNode = htmlStyle.node.parentNode;
                    parentNode.insertBefore(document.createComment('[if gte IE ' + ieVersion + ']><!'), htmlStyle.node);
                    var endMarker = document.createComment('<![endif]');
                    if (htmlStyle.node.nextSibling) {
                        parentNode.insertBefore(endMarker, htmlStyle.node.nextSibling);
                    } else {
                        parentNode.appendChild(endMarker);
                    }
                    var cssAssetClone = cssAsset.clone(htmlStyle),
                        media = htmlStyle.node.getAttribute('media');
                    if (media) {
                        htmlStyleInInternetExplorerConditionalComment.node.setAttribute('media', media);
                        internetExplorerConditionalCommentBody.markDirty();
                    }

                    assetGraph.findRelations({from: cssAssetClone, type: 'CssImage', to: {isImage: true, isInline: false}}).forEach(function (cssImage) {
                        if (/\?(?:|[^#]*&)inline(?:[#&]|$)/.test(cssImage.to.url) ||
                            (!/^_/.test(cssImage.propertyName) && // Underscore hack (IE6), don't inline
                             sizeThreshold >= 0 &&
                             cssImage.to.rawSrc.length <= sizeThreshold &&
                             assetGraph.findRelations({from: cssAsset, to: cssImage.to}).length === 1)) {
                            cssImage.inline();
                        }
                    });
                    htmlAsset.markDirty();
                }
            });
        });
    };
};

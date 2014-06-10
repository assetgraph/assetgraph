var _ = require('lodash');

// Inlines images in Css as data: urls
//
//   If the url of the image has an 'inline' GET parameter, it is inlined if the parameter has a true (or no) value, eg.: foo.png?inline or foo.png?inline=true
//   Otherwise the image will be inlined if the size of the image is less than or equal to 'sizeThreshold' AND the Css asset only has that one relation to the image
//
// Note: If provided, the queryObj argument must specify the set of Html assets to start from so that a fallback IE stylesheet can be created.

function cssRuleIsInsideMediaRule(cssRule) {
    while (cssRule) {
        if (cssRule.type === 4) { // MEDIA_RULE
            return true;
        } else {
            cssRule = cssRule.parentRule;
        }
    }
    return false;
}

module.exports = function (queryObj, sizeThreshold) {
    return function inlineCssImagesWithLegacyFallback(assetGraph) {
        var allCssImages = []; // Might contain duplicates
        assetGraph.findAssets(_.extend({type: 'Html', isInline: false}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                var cssAsset = htmlStyle.to,
                    cssImages = assetGraph.findRelations({type: 'CssImage', from: cssAsset, to: {isImage: true, isInline: false, isLoaded: true}}),
                    ieVersion = 8,
                    hasCssImagesToInline = false;

                Array.prototype.push.apply(allCssImages, cssImages);

                function cssImageShouldBeInlined(cssImage) {
                    var matchInlineParamInUrl = cssImage.to.url.match(/\?(?:|[^#]*&)inline(?:=([^#&]*))?(?:[#&]|$)/);
                    if (matchInlineParamInUrl) {
                        var inlineParamValue = matchInlineParamInUrl[1];
                        return !inlineParamValue || /^(?:true|on|yes|1)$/i.test(inlineParamValue);
                    } else {
                        return (
                            !/^_/.test(cssImage.propertyName) && // Underscore hack (IE6), don't inline
                            sizeThreshold >= 0 &&
                            cssImage.to.rawSrc.length <= sizeThreshold &&
                            !cssRuleIsInsideMediaRule(cssImage.cssRule) &&
                            assetGraph.findRelations({from: cssAsset, to: cssImage.to}).length === 1
                        );
                    }
                }

                cssImages.forEach(function (cssImage) {
                    if (cssImageShouldBeInlined(cssImage)) {
                        hasCssImagesToInline = true;
                        if (cssImage.to.rawSrc.length > 32 * 1024) {
                            ieVersion = 9; // IE 8 doesn't support data URLs > 32 KB
                        }
                    }
                });
                if (hasCssImagesToInline) {
                    var document = htmlAsset.parseTree,
                        internetExplorerConditionalCommentBody = new assetGraph.Html({text: ''});

                    assetGraph.addAsset(internetExplorerConditionalCommentBody);

                    new assetGraph.HtmlConditionalComment({
                        to: internetExplorerConditionalCommentBody,
                        condition: 'lt IE ' + ieVersion
                    }).attach(htmlAsset, 'before', htmlStyle);
                    var htmlStyleInInternetExplorerConditionalComment = new assetGraph.HtmlStyle({to: cssAsset, hrefType: htmlStyle.hrefType});
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

                    assetGraph.findRelations({from: cssAssetClone, type: 'CssImage', to: {isImage: true, isInline: false, isLoaded: true }}).filter(cssImageShouldBeInlined).forEach(function (cssImage) {
                        cssImage.inline();
                    });
                    htmlAsset.markDirty();
                }
            });
        });

        // Remove the inline parameter from the urls of all the seen CssImages (even then ones with ?inline=false)
        allCssImages.forEach(function (cssImage) {
            if (cssImage.to.url) {
                cssImage.to.url = cssImage.to.url.replace(/\?(|[^#]*&)inline(?:=[^#&]*)?([#&]|$)/, function ($0, before, after) {
                    if (before || after) {
                        return '?' + before + after;
                    } else {
                        return '';
                    }
                });
            }
        });
    };
};

var _ = require('underscore'),
    relations = require('../relations'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function inlineCssImagesWithLegacyFallback(assetGraph) {
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                var cssAsset = htmlStyle.to,
                    cssImages = assetGraph.findRelations({from: cssAsset, to: {isImage: true, isInline: false}}),
                    cssImagesToInline = [];
                cssImages.forEach(function (cssImage) {
                    if (cssImage.to.rawSrc.length < 32768 * 3 / 4 - 50 && assetGraph.findRelations({to: cssImage.to}).length === 1) {
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

                    var legacyStyleSheet = assetGraph.cloneAsset(cssAsset, [htmlStyleInConditionalComment]);

                    assetGraph.refreshRelationHref(htmlStyleInConditionalComment);
                    htmlStyle.node.parentNode.insertBefore(document.createComment("[if !IE]>"), htmlStyle.node);
                    if (htmlStyle.node.nextSibling) {
                        htmlStyle.node.parentNode.insertBefore(document.createComment("<![endif]"), htmlStyle.node.nextSibling);
                    } else {
                        htmlStyle.node.parentNode.appendChild(document.createComment("<![endif]"));
                    }
                    cssImagesToInline.forEach(function (cssImage) {
                        assetGraph.inlineRelation(cssImage);
                    });
                }
            });
        });
    };
};

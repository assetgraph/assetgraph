var _ = require('underscore'),
    relations = require('../relations'),
    assets = require('../assets');

module.exports = function (queryObj) {
    return function inlineCssImages(assetGraph) {
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
                    var legacyStyleSheet = assetGraph.cloneAsset(cssAsset),
                        document = htmlAsset.parseTree,
                        conditionalCommentBody = new assets.Html({
                            // The empty string causes jsdom to fall back to "<html><head></head><body></body></html>"
                            // https://github.com/tmpvar/jsdom/pull/286
                            text: " "
                        });
                    conditionalCommentBody.parseTree.removeChild(conditionalCommentBody.parseTree.firstChild); // Remove the " " text node

                    assetGraph.addAsset(conditionalCommentBody);
                    assetGraph.attachAndAddRelation(new relations.HtmlConditionalComment({
                        from: htmlAsset,
                        to: conditionalCommentBody,
                        condition: "IE"
                    }), 'before', htmlStyle);

                    var htmlStyleInConditionalComment = new relations.HtmlStyle({
                        to: legacyStyleSheet
                    });
                    htmlStyleInConditionalComment.attach(conditionalCommentBody, 'first');
                    assetGraph.refreshRelationHref(htmlStyleInConditionalComment);
                    var nonIeConditionalCommentStartNode = document.createComment("[if !IE]<!"),
                        nonIeConditionalCommentEndNode = document.createComment("<![endif]");
                    htmlStyle.node.parentNode.insertBefore(nonIeConditionalCommentStartNode, htmlStyle.node);
                    if (htmlStyle.node.nextSibling) {
                        htmlStyle.node.parentNode.insertBefore(nonIeConditionalCommentEndNode, htmlStyle.node.nextSibling);
                    } else {
                        htmlStyle.node.parentNode.appendChild(nonIeConditionalCommentEndNode);
                    }
                    cssImagesToInline.forEach(function (cssImage) {
                        assetGraph.inlineRelation(cssImage);
                    });
                }
            });
        });
    };
};

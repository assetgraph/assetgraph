var _ = require('lodash'),
    AssetGraph = require('../');

module.exports = function (queryObj) {
    return function convertHtmlStylesToInlineCssImports(assetGraph) {
        var addedInlineCssAssets = [],
            currentInlineCssAsset;
        assetGraph.findAssets(_.extend({type: 'Html'}, queryObj)).forEach(function (htmlAsset) {
            assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset}).forEach(function (htmlStyle) {
                if (!htmlStyle.to.url) {
                    // Skip already inline stylesheet.
                    currentInlineCssAsset = null;
                    return;
                }
                if (!currentInlineCssAsset || assetGraph.findRelations({from: currentInlineCssAsset}).length > 31) {
                    currentInlineCssAsset = new AssetGraph.Css({
                        isDirty: true,
                        text: ''
                    });
                    addedInlineCssAssets.push(currentInlineCssAsset);
                    assetGraph.addAsset(currentInlineCssAsset);
                    new AssetGraph.HtmlStyle({
                        to: currentInlineCssAsset
                    }).attach(htmlAsset, 'before', htmlStyle);
                }
                var mediaText = htmlStyle.node.getAttribute('media');
                currentInlineCssAsset.parseTree.append('@import ""' + (mediaText ? ' ' + mediaText : ''));
                var cssImportRule = currentInlineCssAsset.parseTree.last;

                var cssImport = new AssetGraph.CssImport({
                    to: htmlStyle.to,
                    node: cssImportRule,
                    hrefType: htmlStyle.hrefType
                });
                currentInlineCssAsset.addRelation(cssImport, 'last');
                cssImport.refreshHref();
                htmlStyle.detach();
            });
        });
    };
};

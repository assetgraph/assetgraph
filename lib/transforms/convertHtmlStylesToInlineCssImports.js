const _ = require('lodash');
const AssetGraph = require('../AssetGraph');

module.exports = queryObj => {
    return function convertHtmlStylesToInlineCssImports(assetGraph) {
        const addedInlineCssAssets = [];
        let currentInlineCssAsset;
        for (const htmlAsset of assetGraph.findAssets(_.extend({type: 'Html'}, queryObj))) {
            for (const htmlStyle of assetGraph.findRelations({type: 'HtmlStyle', from: htmlAsset})) {
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
                const mediaText = htmlStyle.node.getAttribute('media');
                currentInlineCssAsset.parseTree.append('@import ""' + (mediaText ? ' ' + mediaText : ''));
                const cssImportRule = currentInlineCssAsset.parseTree.last;

                const cssImport = new AssetGraph.CssImport({
                    to: htmlStyle.to,
                    node: cssImportRule,
                    hrefType: htmlStyle.hrefType
                });
                currentInlineCssAsset.addRelation(cssImport, 'last');
                cssImport.refreshHref();
                htmlStyle.detach();
            }
        }
    };
};

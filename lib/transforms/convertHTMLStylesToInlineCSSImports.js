var _ = require('underscore'),
    cssom = require('../3rdparty/CSSOM/lib'),
    assets = require('../assets'),
    relations = require('../relations'),
    query = require('../query');

module.exports = function (queryObj) {
    return function convertHTMLStylesToInlineCSSImports(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        var addedInlineCSSAssets = [],
            currentInlineCSSAsset;
        assetGraph.findAssets(_.extend({type: 'HTML'}, queryObj)).forEach(function (asset) {
            assetGraph.findRelations({type: 'HTMLStyle', from: asset}).forEach(function (htmlStyle) {
                if (!htmlStyle.to.url) {
                    // Skip already inline stylesheet.
                    currentInlineCSSAsset = null;
                    return;
                }
                if (!currentInlineCSSAsset || assetGraph.findRelations({from: currentInlineCSSAsset}).length > 31) {
                    currentInlineCSSAsset = new assets.CSS({
                        isDirty: true,
                        parseTree: new cssom.CSSStyleSheet()
                    });
                    addedInlineCSSAssets.push(currentInlineCSSAsset);
                    assetGraph.addAsset(currentInlineCSSAsset);
                    assetGraph.attachAndAddRelation(new relations.HTMLStyle({
                        from: asset,
                        to: currentInlineCSSAsset
                    }), 'before', htmlStyle);
                }
                var cssImportRule = new cssom.CSSImportRule(),
                    mediaText = htmlStyle.node.getAttribute('media');
                if (mediaText) {
                    cssImportRule.media.mediaText = mediaText;
                }
                currentInlineCSSAsset.parseTree.cssRules.push(cssImportRule);

                var cssImport = new relations.CSSImport({
                    from: currentInlineCSSAsset,
                    to: htmlStyle.to,
                    cssRule: cssImportRule
                });
                assetGraph.addRelation(cssImport);
                assetGraph.refreshRelationUrl(cssImport);
                assetGraph.detachAndRemoveRelation(htmlStyle);
            });
        });
        process.nextTick(cb);
    };
};

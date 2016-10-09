var query = require('../query');

module.exports = function (options) {
    options = options || {};

    var externalImportQuery = options.populationQuery || {
        // stopAssets are only in case somehow a relation pointing at Html gets into the mix
        stopAssets: {
            type: 'Html',
            url: query.not(undefined)
        },

        // Try to avoid relations that might point to new Html pages
        followRelations: {
            type: query.not([
                // 'CacheManifestEntry',
                // 'CssAlphaImageLoader',
                // 'CssBehavior',
                // 'CssFontFaceSrc',
                // 'CssImage',
                // 'CssImport',
                // 'CssSourceMappingUrl',
                // 'CssSourceUrl',
                // 'CssUrlTokenRelation',
                'HtmlAlternateLink',
                'HtmlAnchor',
                // 'HtmlAppleTouchStartupImage',
                // 'HtmlApplet',
                'HtmlApplicationManifest',
                // 'HtmlAudio',
                'HtmlAuthorLink',
                'HtmlCacheManifest',
                // 'HtmlConditionalComment',
                // 'HtmlContentSecurityPolicy',
                // 'HtmlDataBindAttribute',
                'HtmlDnsPrefetchLink',
                'HtmlEdgeSideInclude',
                'HtmlEdgeSideIncludeSafeComment',
                // 'HtmlEmbed',
                // 'HtmlFluidIconLink',
                'HtmlFrame',
                'HtmlIFrame',
                'HtmlIFrameSrcDoc',
                // 'HtmlImage',
                // 'HtmlImageSrcSet',
                // 'HtmlImport',
                // 'HtmlInlineEventHandler',
                // 'HtmlInlineFragment',
                // 'HtmlInlineScriptTemplate',
                // 'HtmlKnockoutContainerless',
                // 'HtmlLogo',
                // 'HtmlMetaRefresh',
                // 'HtmlMsApplicationTileImageMeta',
                // 'HtmlObject',
                'HtmlOpenGraph',
                // 'HtmlParamsAttribute',
                // 'HtmlPictureSource',
                // 'HtmlPictureSourceSrcSet',
                'HtmlPreconnectLink',
                'HtmlPrefetchLink',
                'HtmlPreloadLink',
                'HtmlPrerenderLink',
                // 'HtmlRelation',
                // 'HtmlResourceHint',
                // 'HtmlScript',
                'HtmlSearchLink',
                // 'HtmlServiceWorkerRegistration',
                // 'HtmlShortcutIcon',
                // 'HtmlStyle',
                // 'HtmlStyleAttribute',
                // 'HtmlSvgIsland',
                // 'HtmlTemplate',
                // 'HtmlVideo',
                // 'HtmlVideoPoster',
                'HttpRedirect',
                // 'JavaScriptFetch',
                // 'JavaScriptImportScripts',
                'JavaScriptServiceWorkerRegistration',
                // 'JavaScriptSourceMappingUrl',
                // 'JavaScriptSourceUrl',
                // 'JavaScriptStaticUrl',
                // 'JavaScriptWebWorker',
                // 'JsonUrl',
                // 'Relation',
                'RssChannelLink',
                // 'SourceMapFile',
                // 'SourceMapSource',
                // 'SrcSetEntry',
                'SvgAnchor'
                // 'SvgFontFaceUri',
                // 'SvgImage',
                // 'SvgInlineEventHandler',
                // 'SvgPattern',
                // 'SvgRelation',
                // 'SvgScript',
                // 'SvgStyle',
                // 'SvgStyleAttribute',
                // 'SvgUse',
                // 'SystemJsBundle',
                // 'SystemJsLazyBundle',
                // 'XmlHtmlInlineFragment',
                // 'XmlStylesheet'
            ])
        }
    };

    var importPathName = options.importPath || 'external-imports';

    return function importExternalAssets(assetGraph) {
        var wasThereBeforeByAssetId = {};
        assetGraph.findAssets().forEach(function (asset) {
            wasThereBeforeByAssetId[asset.id] = true;
        });

        return assetGraph
            .populate(externalImportQuery)
            .queue(function moveExternalAssetsInternal(assetGraph) {
                assetGraph.findAssets()
                    .filter(function (asset) {
                        return !wasThereBeforeByAssetId[asset.id];
                    })
                    .forEach(function (asset) {
                        asset.url = assetGraph.root + [importPathName, asset.fileName.replace(asset.extension, '-' + asset.id + asset.extension)].join('/');

                        asset.incomingRelations.forEach(function (relation) {
                            relation.hrefType = 'rootRelative';
                        });
                    });
            });
    };
};

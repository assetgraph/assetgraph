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
        return assetGraph
            .populate(externalImportQuery)
            .queue(function moveExternalAssetsInternal(assetGraph) {
                assetGraph.findRelations({
                    to: {
                        isLoaded: true,
                        url: function (url) {
                            return url.indexOf(assetGraph.root) === -1;
                        }
                    }
                }).forEach(function (relation) {
                    var to = relation.to;

                    if (to.url) {
                        relation.hrefType = 'rootRelative';
                        to.url = assetGraph.root + [importPathName, to.fileName.replace(to.extension, '-' + to.id + to.extension)].join('/');
                    }
                });
            });
    };
};

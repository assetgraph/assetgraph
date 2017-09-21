var urlModule = require('url');
var queryString = require('querystring');
var _ = require('lodash');
var memoizeSync = require('memoizesync');

var getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
var googleFontsReducer = require('../util/fonts/googleFontsReducer');
var getFontPropsFromGoogleId = require('../util/fonts/getFontPropsFromGoogleId');
var snapToAvailableFontProperties = require('../util/fonts/snapToAvailableFontProperties');
var cssListHelpers = require('css-list-helpers');
var unquote = require('../util/fonts/unquote');
var getCssRulesByProperty = require('../util/fonts/getCssRulesByProperty');

var googleFontsUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;

function cssQuoteIfNecessary(value) {
    if (/^\w+$/.test(value)) {
        return value;
    } else {
        return '\'' + value.replace(/'/g, '\\\'') + '\'';
    }
}

function splitUpGoogleFontFamilyWeightCombo(url) {
    var parsedUrl = urlModule.parse(url, true);
    var fontString = parsedUrl.query.family;

    if (fontString) {
        var fonts = [].concat.apply([], fontString.split('|').map(function (familyStr) {
            var pair = familyStr.split(':');
            var family = pair[0].replace(' ', '+');
            var weights = pair[1];

            if (weights) {
                return weights.split(',')
                    .map(function (weight) {
                        return family + ':' + weight;
                    });
            } else {
                return [family + ':' + 400];
            }
        }));

        return fonts;
    }
}

function asyncCssLoadScriptRelation(relation) {
    var scriptText = [
        '(function () {',
        '  var el = document.createElement(\'link\');',
        '  el.href = \'' + relation.to.url + '\'.toString(\'url\');',
        '  el.rel = \'stylesheet\';',
        relation.media ? '  el.media = \'' + relation.media + '\';' : '',
        '  document.body.appendChild(el);',
        '}())'
    ].join('\n');

    return relation.from.addRelation({
        type: 'HtmlScript',
        to: {
            type: 'JavaScript',
            text: scriptText
        },
        node: relation.from.parseTree.createElement('script')
    }, 'before', relation);
}

function asyncLoadStyleRelationWithFallback(htmlAsset, originalRelation) {
    var document = htmlAsset.parseTree;
    var injectionPointRelation = originalRelation;

    while (injectionPointRelation.from.isInline) {
        injectionPointRelation = injectionPointRelation.from.incomingRelations[0];
    }

    // Resource hint: prefetch google font stylesheet
    htmlAsset.addRelation({
        type: 'HtmlPrefetchLink',
        hrefType: 'absolute',
        to: originalRelation.to
    }, 'before', injectionPointRelation);

    // Resource hint: prefetch google font stylesheet
    htmlAsset.addRelation({
        type: 'HtmlPreconnectLink',
        hrefType: 'absolute',
        to: { url: 'https://fonts.gstatic.com' }
    }, 'before', injectionPointRelation);

    // Async load google font stylesheet
    var relation = htmlAsset.addRelation({
        type: 'HtmlStyle',
        to: originalRelation.to,
        media: originalRelation.media
    }, 'last');

    // Attach <noscript /> at bottom of <body> and put the <link> in it
    var noScriptNode = document.createElement('noscript');
    noScriptNode.appendChild(relation.node);
    document.body.appendChild(noScriptNode);

    // Insert async CSS loading <script> before <noscript>
    var asyncCssLoadingRelation = asyncCssLoadScriptRelation(relation);

    document.body.appendChild(asyncCssLoadingRelation.node);
    document.body.appendChild(noScriptNode);


    asyncCssLoadingRelation.inline();

    htmlAsset.markDirty();
}

var fontFormatUA = {
    woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
    woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36'
};

module.exports = function (options) {
    options = options || {};
    var subsetPerPage = !!options.subsetPerPage;
    var inlineSubsets = !!options.inlineSubsets;
    var inlineCss = !!options.inlineCss;
    var UA = fontFormatUA[options.format] || fontFormatUA.woff;

    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        assetGraph.teepee.headers['User-Agent'] = UA;

        var fontSubsetCssRelations = [];
        var googleFontSubsetNameMap = {};
        var htmlAssetTextByPropsMap = {};

        assetGraph
            .queue(function collectTextsByPage(assetGraph) {
                var memoizedGetCssRulesByProperty = memoizeSync(getCssRulesByProperty);
                var htmlAssets = assetGraph.findAssets({ type: 'Html', isInline: false });
                var traversalRelationQuery = assetGraph.query.or(
                    {
                        type: ['HtmlStyle', 'CssImport']
                    },
                    {
                        to: {
                            type: 'Html',
                            isInline: true
                        }
                    }
                );

                htmlAssets.forEach(function (htmlAsset) {
                    var accumulatedRelations = [];

                    assetGraph.eachAssetPreOrder(htmlAsset, traversalRelationQuery, function (asset) {
                        var googleFontRelations = assetGraph.findRelations({
                            from: asset,
                            to: { url: googleFontsUrlRegex }
                        });

                        if (googleFontRelations.length > 0) {
                            accumulatedRelations.push(...googleFontRelations);
                        }
                    });

                    if (accumulatedRelations.length) {
                        accumulatedRelations = _.uniq(accumulatedRelations);

                        var googleFontIds = Array.prototype.concat.apply([], accumulatedRelations
                            .map(function (googleFontRelation) {
                                return googleFontRelation.to.url;
                            })
                            .map(splitUpGoogleFontFamilyWeightCombo));

                        var availableFontProps = googleFontIds.map(getFontPropsFromGoogleId);

                        var textByProps = getTextByFontProperties(htmlAsset, memoizedGetCssRulesByProperty)
                            .map(function (textAndProps) {
                                return {
                                    text: textAndProps.text,
                                    props: snapToAvailableFontProperties(availableFontProps, textAndProps.props)
                                };
                            })
                            .filter(function (textByProps) {
                                return textByProps.props;
                            });
                        var uniqueTextByGoogleFontId = googleFontsReducer(textByProps);

                        if (options.debug) {
                            console.error(htmlAsset.urlOrDescription, uniqueTextByGoogleFontId);
                        }

                        var htmlAssetTextByProps = {
                            htmlAsset: htmlAsset,
                            googleFontRelations: accumulatedRelations,
                            textsByGoogleFontId: uniqueTextByGoogleFontId
                        };

                        htmlAssetTextByPropsMap[htmlAsset.url] = htmlAssetTextByProps;
                    }

                });

                if (Object.keys(htmlAssetTextByPropsMap).length <= 1) {
                    subsetPerPage = false;
                }
            })
            .if(!subsetPerPage)
            .queue(function unifySubsetsAcrossPages(assetGraph) {
                var globalSubsets = {};

                // Gather all subsets
                Object.keys(htmlAssetTextByPropsMap).forEach(function (url) {
                    var textsByGoogleFontId = htmlAssetTextByPropsMap[url].textsByGoogleFontId;

                    Object.keys(textsByGoogleFontId).forEach(function (googleId) {
                        if (!globalSubsets[googleId]) {
                            globalSubsets[googleId] = [];
                        }

                        globalSubsets[googleId].push(textsByGoogleFontId[googleId]);
                    });
                }, {});

                // Merge subset values, unique glyphs, sort
                Object.keys(globalSubsets).forEach(function (googleId) {
                    var texts = _.map(globalSubsets[googleId], 'text');

                    globalSubsets[googleId] = {
                        texts: texts,
                        props: globalSubsets[googleId][0].props,
                        text: _.uniq(texts.join(''))
                            .sort()
                            .join('')
                    };
                });

                // Assign the single global subset to all pages
                Object.keys(htmlAssetTextByPropsMap).forEach(function (url) {
                    htmlAssetTextByPropsMap[url].textsByGoogleFontId = globalSubsets;
                });

            })
            .endif()
            .queue(function insertSubsetRelations(assetGraph) {
                Object.keys(htmlAssetTextByPropsMap).forEach(function (assetUrl) {
                    var htmlAssetTextByProps = htmlAssetTextByPropsMap[assetUrl];
                    var htmlAsset = htmlAssetTextByProps.htmlAsset;
                    var textsByGoogleFontId = htmlAssetTextByProps.textsByGoogleFontId;
                    var googleFontCssUrl = htmlAssetTextByProps.googleFontRelations[0].to.url.split('?')[0];

                    Object.keys(textsByGoogleFontId).reverse().forEach(function (googleFontId) {
                        if (textsByGoogleFontId[googleFontId]) {
                            fontSubsetCssRelations.push(htmlAsset.addRelation({
                                type: 'HtmlStyle',
                                to: {
                                    type: 'Css',
                                    url: googleFontCssUrl + '?family=' + googleFontId + '&text=' + encodeURIComponent(textsByGoogleFontId[googleFontId].text)
                                }
                            }, 'first'));
                            const fontName = googleFontId.split(':')[0].replace(/\+/g, ' ');
                            googleFontSubsetNameMap[fontName] = fontName + '__subset';
                        }
                    });
                });
            })
            .queue(function asyncLoadOriginalGoogleFontCss(assetGraph) {
                Object.keys(htmlAssetTextByPropsMap).forEach(function (assetUrl) {
                    var htmlAssetTextByProps = htmlAssetTextByPropsMap[assetUrl];
                    var htmlAsset = htmlAssetTextByProps.htmlAsset;
                    var googleFontRelations = htmlAssetTextByProps.googleFontRelations;

                    googleFontRelations.forEach(function (googleFontRelation) {
                        asyncLoadStyleRelationWithFallback(htmlAsset, googleFontRelation);
                    });
                });

                var allGoogleFontRelations = Object.keys(htmlAssetTextByPropsMap).reduce(function (result, assetUrl) {
                    result.push.apply(result, htmlAssetTextByPropsMap[assetUrl].googleFontRelations);

                    return result;
                }, []);

                _.uniq(allGoogleFontRelations).forEach(function (googleFontRelation) {
                    googleFontRelation.detach();
                });
            })
            .populate({
                from: { type: 'Html' },
                followRelations: assetGraph.query.or(
                    { to: { url: assetGraph.query.and(googleFontsUrlRegex, /&text=/) } },
                    {
                        from: { url: googleFontsUrlRegex },
                        type: 'CssFontFaceSrc'
                    }
                )
            })
            .queue(function moveSubsetAssetsToLocal(assetGraph) {
                Object.keys(htmlAssetTextByPropsMap).forEach(function (assetUrl) {
                    var htmlAsset = htmlAssetTextByPropsMap[assetUrl].htmlAsset;
                    var fontStyleSheetRelations = assetGraph.findRelations({ type: 'HtmlStyle', from: htmlAsset, to: { url: assetGraph.query.and(googleFontsUrlRegex, /&text=/) } });

                    if (fontStyleSheetRelations.length === 0) {
                        return;
                    }

                    // Move web fonts to local domain
                    fontStyleSheetRelations.forEach(function (fontStyleSheetRelation) {
                        if (!fontStyleSheetRelation.to.isLoaded) {
                            return;
                        }

                        var parsedUrl = urlModule.parse(fontStyleSheetRelation.to.url);
                        var qs = queryString.parse(parsedUrl.query);

                        if (qs.family) {
                            var fileNamePreFix = qs.family.replace(' ', '+').replace(':', '_') + '-';

                            fontStyleSheetRelation.to.outgoingRelations.forEach(function (fontRelation) {
                                var fontAsset = fontRelation.to;

                                var fileName = fileNamePreFix + fontAsset.md5Hex.slice(0, 10) + '.' + fontAsset.contentType.split('/').pop();
                                fontAsset.url = assetGraph.root + 'google-font-subsets/' + fileName;

                                if (inlineSubsets) {
                                    fontRelation.inline();
                                } else {
                                    fontStyleSheetRelation.from.addRelation({
                                        type: 'HtmlPreloadLink',
                                        hrefType: 'rootRelative',
                                        to: fontAsset
                                    }, 'before', fontStyleSheetRelations[0]);
                                }
                            });
                        }
                    });

                    var source = fontStyleSheetRelations.map(function (relation) {
                        return relation.to.text;
                    }).join('\n');

                    let fontStyleBundle = assetGraph.findAssets({ type: 'Css', isLoaded: true, url: /google-font-subsets\/fonts-/, text: source })[0];

                    if (!fontStyleBundle) {
                        fontStyleBundle = assetGraph.addAsset({
                            type: 'Css',
                            text: source
                        });
                        fontStyleBundle.url = assetGraph.root + 'google-font-subsets/fonts-' + fontStyleBundle.md5Hex.slice(0, 10) + '.css';

                        fontStyleBundle.outgoingRelations.forEach(function (fontRelation) {
                            fontRelation.to = assetGraph.findAssets({ url: fontRelation.to.url })[0];
                            fontRelation.hrefType = 'relative';

                            fontRelation.refreshHref();
                        });

                        fontStyleBundle.minify();
                    }

                    htmlAsset.addRelation({
                        type: 'HtmlStyle',
                        hrefType: 'rootRelative',
                        to: fontStyleBundle
                    }, 'before', fontStyleSheetRelations[0]);

                    if (inlineCss) {
                        bundleRelation.inline();

                        fontStyleBundle.outgoingRelations.forEach(function (fontRelation) {
                            fontRelation.hrefType = 'rootRelative';
                        });
                    }

                    fontStyleSheetRelations.forEach(function (relation) {
                        relation.detach();
                    });
                });

                assetGraph.findAssets({ type: 'Css', url: /google-font-subsets\/fonts-/ }).forEach(function (CssBundle) {
                    CssBundle.outgoingRelations.forEach(function (fontFaceSrc) {
                        fontFaceSrc.hrefType = 'relative';
                    });
                });
            })
            .removeUnreferencedAssets({ type: 'Css', url: googleFontsUrlRegex })
            .queue(function renameSubsetFonts() {
                // Inject subset font name before original webfomt
                assetGraph.findAssets({type: 'Css', isLoaded: true }).forEach(function (cssAsset) {
                    var changesMade = false;
                    cssAsset.eachRuleInParseTree(function (cssRule) {
                        if (cssRule.type === 'decl' && cssRule.prop === 'font-family') {
                            if (cssRule.parent.type === 'rule') {
                                var fontFamilies = cssListHelpers.splitByCommas(cssRule.value).map(unquote);
                                var subsetFontFamily = googleFontSubsetNameMap[fontFamilies[0]];
                                if (subsetFontFamily && fontFamilies.indexOf(subsetFontFamily) === -1) {
                                    cssRule.value = cssQuoteIfNecessary(subsetFontFamily) + ', ' + cssRule.value;
                                    changesMade = true;
                                }
                            }

                            if (cssRule.parent.type === 'atrule' && cssRule.parent.name === 'font-face') {
                                cssRule.value = cssQuoteIfNecessary(googleFontSubsetNameMap[unquote(cssRule.value)] || cssRule.value);
                                changesMade = true;
                            }
                        }
                    });
                    if (changesMade) {
                        cssAsset.markDirty();
                    }
                });
            })
            .then(function (assetGraph) {
                // Undo User-Agent override
                assetGraph.teepee.headers['User-Agent'] = assetGraphUA;

                cb();
            });
    };
};

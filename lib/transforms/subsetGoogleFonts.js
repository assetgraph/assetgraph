var _ = require('lodash');
var memoizeSync = require('memoizesync');
var urltools = require('urltools');

var AssetGraph = require('../');

var getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
var getGoogleIdForFontProps = require('../util/fonts/getGoogleIdForFontProps');
var snapToAvailableFontProperties = require('../util/fonts/snapToAvailableFontProperties');
var cssListHelpers = require('css-list-helpers');
var cssFontWeightNames = require('css-font-weight-names');
var unquote = require('../util/fonts/unquote');
var getCssRulesByProperty = require('../util/fonts/getCssRulesByProperty');

var googleFontsCssUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;
var googleFontUrlRegex = /^https?:\/\/fonts\.gstatic\.com\//;

function cssQuoteIfNecessary(value) {
    if (/^\w+$/.test(value)) {
        return value;
    } else {
        return '\'' + value.replace(/'/g, '\\\'') + '\'';
    }
}

function getGoogleFontSubsetCssUrl(fontProps, text) {
    var googleFontId = getGoogleIdForFontProps(fontProps);

    return 'https://fonts.googleapis.com/css?family=' + googleFontId + '&text=' + encodeURIComponent(text);
}

// Takes the output of util/fonts/getTextByFontProperties
function groupTextsByFontFamilyProps(textByPropsArray, availableFontFaceDeclarations) {
    var snappedTexts = textByPropsArray
        .map(function (textAndProps) {
            return {
                text: textAndProps.text,
                props: snapToAvailableFontProperties(availableFontFaceDeclarations, textAndProps.props)
            };
        })
        .filter(function (textByProps) {
            return textByProps.props;
        });

    var textsByFontUrl = _.groupBy(snappedTexts, function (obj) { return obj.props.src; });

    return _.map(textsByFontUrl, function (textsPropsArray) {
        var texts = textsPropsArray.map(function (obj) {
            return obj.text;
        });
        return {
            texts: texts,
            text: _.uniq(texts.join(''))
                .sort()
                .join(''),
            props: Object.assign({}, textsPropsArray[0].props)
        };
    });
}

// function getParents(assetGraph, asset, relationQuery) {
//   const seenAssets = new Set();
//   const parents = new Set();
//   (function visit(asset) {
//     if (seenAssets.has(asset)) {
//       return;
//     }
//     seenAssets.add(asset);
//     for (const matchingIncomingRelation of assetGraph.findRelations({to: asset, ...relationQuery})) {
//       parents.add(matchingIncomingRelation.from);
//       visit(matchingIncomingRelation.from);
//     }
//   }(asset));
//   return Array.from(parents);
// }

function getParents(assetGraph, asset, assetQuery) {
    var assetMatcher = assetGraph.query.createValueMatcher(assetQuery);
    var seenAssets = {};
    var parents = [];
    (function visit(asset) {
        if (asset.id in seenAssets) {
            return;
        }
        seenAssets[asset.id] = asset;

        asset.incomingRelations.forEach(function (incomingRelation) {
            if (assetMatcher(incomingRelation.from)) {
                parents.push(incomingRelation.from);
            } else {
                visit(incomingRelation.from);
            }
        });
    }(asset));

    return parents;
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

    var asset = new AssetGraph.JavaScript(relation.assetGraph.resolveAssetConfig({
        text: scriptText
    }));

    relation.assetGraph.addAsset(asset);

    var newRelation = new AssetGraph.HtmlScript({
        from: relation.from,
        to: asset,
        node: relation.from.parseTree.createElement('script')
    });

    return newRelation;
}

function asyncLoadStyleRelationWithFallback(htmlAsset, originalRelation, insertPoint) {
    var document = htmlAsset.parseTree;
    var injectionPointRelation = insertPoint || htmlAsset.outgoingRelations[0];

    // Resource hint: prefetch google font stylesheet
    var preconnectRelation = new AssetGraph.HtmlPreconnectLink({
        hrefType: 'absolute',
        from: htmlAsset,
        to: { url: 'https://fonts.gstatic.com' }
    });

    preconnectRelation.attach(htmlAsset, 'after', injectionPointRelation);

    // Resource hint: prefetch google font stylesheet
    var prefetchRelation = new AssetGraph.HtmlPrefetchLink({
        hrefType: 'absolute',
        from: htmlAsset,
        to: { url: originalRelation.to.url }
    });

    prefetchRelation.attach(htmlAsset, 'before', preconnectRelation);


    // Async load google font stylesheet
    var fallbackRelation = new AssetGraph.HtmlStyle({
        from: htmlAsset,
        to: { url: originalRelation.to.url }
    });

    fallbackRelation.attach(htmlAsset, 'last');
    fallbackRelation.media = originalRelation.media;

    // Insert async CSS loading <script> before <noscript>
    var asyncCssLoadingRelation = asyncCssLoadScriptRelation(fallbackRelation);
    asyncCssLoadingRelation.attach(htmlAsset, 'before', fallbackRelation);

    document.body.appendChild(asyncCssLoadingRelation.node);
    asyncCssLoadingRelation.inline();

    // Attach <noscript /> at bottom of <body> and put the <link> in it
    var noScriptNode = document.createElement('noscript');
    document.body.appendChild(noScriptNode);
    noScriptNode.appendChild(fallbackRelation.node);

    // Clean up
    originalRelation.detach();

    htmlAsset.markDirty();
}

var fontFormatUA = {
    woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
    woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36'
};

var validFontDisplayValues = [
    'auto',
    'block',
    'swap',
    'fallback',
    'optional'
];

module.exports = function (options) {
    options = options || {};
    var subsetPerPage = !!options.subsetPerPage;
    var inlineSubsets = !!options.inlineSubsets;
    var inlineCss = !!options.inlineCss;
    var fontDisplay = validFontDisplayValues.indexOf(options.fontDisplay) !== -1 && options.fontDisplay;
    var UA = fontFormatUA[options.format] || fontFormatUA.woff;

    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        assetGraph.teepee.headers['User-Agent'] = UA;

        var htmlAssetTextsWithProps = [];
        var subsetPath = urltools.ensureTrailingSlash(urltools.ensureTrailingSlash(assetGraph.root) + (options.subsetPath || 'subfont/'));

        assetGraph
            .populate({
                followRelations: {
                    to: {
                        url: googleFontsCssUrlRegex
                    }
                }
            })
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
                    var accumulatedFontFaceDeclarations = [];

                    assetGraph.eachAssetPreOrder(htmlAsset, traversalRelationQuery, function (asset) {
                        if (asset.type === 'Css') {
                            var fontRelations = asset.outgoingRelations.filter(function (relation) { return relation.type === 'CssFontFaceSrc'; });

                            fontRelations.forEach(function (fontRelation) {
                                var fontFaceDeclaration = {
                                    src: fontRelation.to.url
                                };

                                fontRelation.node.walkDecls(function (declaration) {
                                    if (declaration.prop !== 'src') {
                                        if (declaration.prop === 'font-weight') {
                                            fontFaceDeclaration[declaration.prop] = cssFontWeightNames[declaration.value] || parseInt(declaration.value, 10);
                                        } else {
                                            fontFaceDeclaration[declaration.prop] = unquote(declaration.value);
                                        }
                                    }
                                });

                                accumulatedFontFaceDeclarations.push(fontFaceDeclaration);
                            });
                        }
                    });

                    if (accumulatedFontFaceDeclarations.length) {
                        var textByProps = getTextByFontProperties(htmlAsset, memoizedGetCssRulesByProperty);

                        htmlAssetTextsWithProps.push({
                            htmlAsset: htmlAsset,
                            fontUsages: groupTextsByFontFamilyProps(textByProps, accumulatedFontFaceDeclarations)
                        });
                    }
                });

                if (htmlAssetTextsWithProps.length <= 1) {
                    subsetPerPage = false;
                }

                if (!subsetPerPage) {
                    var globalFontUsage = {};

                    // Gather all subsets
                    htmlAssetTextsWithProps.forEach(function (htmlAssetTextWithProps) {
                        htmlAssetTextWithProps.fontUsages.forEach(function (fontUsage) {
                            if (!globalFontUsage[fontUsage.props.src]) {
                                globalFontUsage[fontUsage.props.src] = [];
                            }

                            globalFontUsage[fontUsage.props.src].push(fontUsage);
                        });
                    });

                    // Merge subset values, unique glyphs, sort
                    Object.keys(globalFontUsage).forEach(function (src) {
                        var fontUsages = globalFontUsage[src];
                        var texts = _.map(fontUsages, 'text');

                        globalFontUsage[src] = {
                            props: fontUsages[0].props,
                            text: _.uniq(texts.join(''))
                                .sort()
                                .join('')
                        };
                    });

                    // Assign the single global subset to all pages
                    htmlAssetTextsWithProps.forEach(function (htmlAssetTextWithProps) {
                        htmlAssetTextWithProps.fontUsages = _.toArray(globalFontUsage);
                    });
                }

                if (options.debug) {
                    console.error(JSON.stringify(htmlAssetTextsWithProps, function (key, value) {
                        if (value.isAsset === true) {
                            return value.url;
                        }

                        return value;
                    }, 2));

                    process.exit();
                }
            })
            .queue(function subsetGoogleFonts(assetGraph, done) {
                var fontUsageBySubsetCssRelationId = {};

                var googleFontSubsetCssRelations = htmlAssetTextsWithProps
                    .map(function (htmlAssetTextWithProps) {
                        var htmlAsset = htmlAssetTextWithProps.htmlAsset;
                        var firstHtmlStyleRelation = htmlAsset.outgoingRelations.find(function (relation) {
                            return relation.type === 'HtmlStyle';
                        });
                        var fontUsages = htmlAssetTextWithProps.fontUsages;

                        var googleFontUsages = fontUsages
                            .filter(function (fontUsage) {
                                return googleFontUrlRegex.test(fontUsage.props.src);
                            });

                        var insertedRelations = googleFontUsages
                            .map(function (fontUsage) {
                                var cssUrl = getGoogleFontSubsetCssUrl(fontUsage.props, fontUsage.text);

                                var individualRelation = new assetGraph.HtmlStyle({
                                    to: new assetGraph.Css(assetGraph.resolveAssetConfig({
                                        url: cssUrl
                                    })),
                                    node: htmlAsset.parseTree.createElement('link')
                                });

                                individualRelation.attachNodeBeforeOrAfter('before', firstHtmlStyleRelation);

                                fontUsageBySubsetCssRelationId[individualRelation.id] = fontUsage;

                                return individualRelation;
                            });

                        return insertedRelations;
                    })
                    .reduce(function (result, current) {
                        return result.concat(current);
                    }, []);

                assetGraph
                    .populate({
                        followRelations: googleFontSubsetCssRelations.concat({
                            type: 'CssFontFaceSrc',
                            from: googleFontSubsetCssRelations.map(o => o.to)
                        })
                    })
                    .queue(function moveSubsetAssetsToLocal() {
                        var googleFontSubsetCssRelationsByPage = _.map(_.groupBy(googleFontSubsetCssRelations, 'from.id'));

                        googleFontSubsetCssRelationsByPage.forEach(function (fontStyleSheetRelations) {
                            var htmlAsset = fontStyleSheetRelations[0].from;
                            var insertpoint = fontStyleSheetRelations[0];

                            // Move google font subsets to local domain
                            fontStyleSheetRelations.forEach(function (fontStyleSheetRelation) {
                                var cssAsset = fontStyleSheetRelation.to;

                                if (!cssAsset.isLoaded) {
                                    return;
                                }

                                var fontUsage = fontUsageBySubsetCssRelationId[fontStyleSheetRelation.id];
                                var fileNamePreFix = fontUsage.props['font-family'].replace(' ', '+') + '_' + fontUsage.props['font-weight'];

                                cssAsset.outgoingRelations.forEach(function (fontRelation) {
                                    // Either inline the fonts or add <link rel=preload> to them
                                    if (inlineSubsets) {
                                        fontRelation.inline();
                                    } else {
                                        // Name the font so its url makes sense. Including content adressable hash
                                        var fontAsset = fontRelation.to;

                                        if (!fontAsset.isLoaded) {
                                            // This is probably an error. Emit something?
                                            return;
                                        }

                                        var extension = fontAsset.contentType.split('/').pop();
                                        var fileName = fileNamePreFix + '-' + fontAsset.md5Hex.slice(0, 10) + '.' + extension;

                                        fontAsset.url = subsetPath + fileName;

                                        var preloadRelation = new AssetGraph.HtmlPreloadLink({
                                            hrefType: 'rootRelative',
                                            to: fontAsset,
                                            as: 'font'
                                        });

                                        preloadRelation.attach(htmlAsset, 'before', insertpoint);
                                    }
                                });
                            });

                            // Bundle google font subset CSS files
                            var bundleSource = fontStyleSheetRelations.map(function (relation) {
                                return relation.to.text;
                            }).join('\n');

                            var fontStyleBundle = assetGraph.findAssets({
                                type: 'Css',
                                isLoaded: true,
                                url: function (assetUrl) {
                                    return typeof assetUrl === 'string' && assetUrl.indexOf(subsetPath) === 0;
                                },
                                text: bundleSource
                            })[0];

                            if (!fontStyleBundle) {
                                fontStyleBundle = new AssetGraph.Css(assetGraph.resolveAssetConfig({
                                    text: bundleSource
                                }));

                                if (fontDisplay) {
                                    fontStyleBundle.parseTree.nodes.forEach(function (atRule) {
                                        var declarations = atRule.nodes;
                                        var fontDisplayDeclaration = declarations.find(function (decl) { return decl.prop === 'font-display'; });

                                        if (!fontDisplayDeclaration) {
                                            declarations[0].before('font-display: auto');

                                            fontDisplayDeclaration = declarations[0];
                                        }

                                        fontDisplayDeclaration.value = fontDisplay;
                                    });

                                    fontStyleBundle.markDirty();
                                }

                                assetGraph.addAsset(fontStyleBundle);

                                var bundleFileName = 'fonts-' + fontStyleBundle.md5Hex.slice(0, 10) + '.css';
                                fontStyleBundle.url = subsetPath + bundleFileName;

                                // Point the CSS --> Font relations to the existing font subsets. This avoids an extra populate() call
                                fontStyleBundle.outgoingRelations.forEach(function (fontRelation) {
                                    fontRelation.to = assetGraph.findAssets({ url: fontRelation.to.url })[0];
                                    fontRelation.hrefType = 'relative';

                                    fontRelation.refreshHref();
                                });

                                fontStyleBundle.minify();
                            }

                            var bundleRelation = new AssetGraph.HtmlStyle({
                                hrefType: 'rootRelative',
                                from: htmlAsset,
                                to: fontStyleBundle
                            });

                            bundleRelation.attach(htmlAsset, 'before', insertpoint);

                            if (inlineCss) {
                                bundleRelation.inline();

                                fontStyleBundle.outgoingRelations.forEach(function (fontRelation) {
                                    fontRelation.hrefType = 'rootRelative';
                                });
                            }

                            // Remove references to google font subset CSS files. Now replaced by local bundle
                            fontStyleSheetRelations.forEach(function (relation) {
                                if (relation.to.assetGraph) {
                                    assetGraph.removeAsset(relation.to, true);
                                }
                            });

                        });

                        // assetGraph.findAssets({ type: 'Css', url: /subfont\/fonts-/ }).forEach(function (CssBundle) {
                        //     CssBundle.outgoingRelations.forEach(function (fontFaceSrc) {
                        //         fontFaceSrc.hrefType = 'relative';
                        //     });
                        // });
                    })
                    .queue(function asyncLoadOriginalGoogleFontCss(assetGraph) {
                        var googleFontStylesheets = assetGraph.findAssets({
                            type: 'Css',
                            url: googleFontsCssUrlRegex
                        });

                        googleFontStylesheets.forEach(function (googleFontStylesheet) {
                            googleFontStylesheet.incomingRelations.forEach(function (googleFontStylesheetRelation) {
                                // Gather Html parents. Relevant if we are dealing with CSS @import relations
                                var htmlParents = getParents(assetGraph, googleFontStylesheetRelation.to, {
                                    type: 'Html',
                                    isInline: false,
                                    isLoaded: true
                                });

                                // FIXME: This will fail on @import css relations
                                htmlParents.forEach(function (htmlParent) {
                                    asyncLoadStyleRelationWithFallback(htmlParent, googleFontStylesheetRelation, htmlParent.outgoingRelations.find(function (relation) {
                                        return relation.type === 'HtmlStyle' && relation.to.url.indexOf(subsetPath) === 0;
                                    }));
                                });
                            });

                            assetGraph.removeAsset(googleFontStylesheet);
                        });

                        // var allGoogleFontRelations = Object.keys(htmlAssetTextsWithProps).reduce(function (result, assetUrl) {
                        //     result.push.apply(result, htmlAssetTextsWithProps[assetUrl].googleFontRelations);

                        //     return result;
                        // }, []);

                        // _.uniq(allGoogleFontRelations).forEach(function (googleFontRelation) {
                        //     googleFontRelation.detach();
                        // });
                    })
                    .run(done);
            })
            .queue(function renameSubsetFonts() {
                var webfontNameMap = htmlAssetTextsWithProps
                    .map(function (pageObject) {
                        return pageObject.fontUsages.map(function (fontUsage) {
                            return fontUsage.props['font-family'];
                        });
                    })
                    .reduce(function (result, current) {
                        current.forEach(function (familyName) {
                            result[familyName] = familyName + '__subset';
                        });

                        return result;
                    }, {});

                // Inject subset font name before original webfont
                assetGraph.findAssets({type: 'Css', isLoaded: true }).forEach(function (cssAsset) {
                    var changesMade = false;
                    cssAsset.eachRuleInParseTree(function (cssRule) {
                        if (cssRule.type === 'decl' && cssRule.prop === 'font-family') {
                            if (cssRule.parent.type === 'rule') {
                                var fontFamilies = cssListHelpers.splitByCommas(cssRule.value).map(unquote);
                                var subsetFontFamily = webfontNameMap[fontFamilies[0]];
                                if (subsetFontFamily && fontFamilies.indexOf(subsetFontFamily) === -1) {
                                    cssRule.value = cssQuoteIfNecessary(subsetFontFamily) + ', ' + cssRule.value;
                                    changesMade = true;
                                }
                            }

                            // Rename the subset font declaration itself
                            if (cssRule.parent.type === 'atrule' && cssRule.parent.name === 'font-face') {
                                cssRule.value = cssQuoteIfNecessary(webfontNameMap[unquote(cssRule.value)] || cssRule.value);
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

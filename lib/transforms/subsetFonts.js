var _ = require('lodash');
var url = require('url');
var Promise = require('bluebird');
var memoizeSync = require('memoizesync');
var urltools = require('urltools');

var AssetGraph = require('../../');

var getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
var getGoogleIdForFontProps = require('../util/fonts/getGoogleIdForFontProps');
var snapToAvailableFontProperties = require('../util/fonts/snapToAvailableFontProperties');
var cssListHelpers = require('css-list-helpers');
var cssFontWeightNames = require('css-font-weight-names');
var unquote = require('../util/fonts/unquote');
var getCssRulesByProperty = require('../util/fonts/getCssRulesByProperty');

var googleFontsCssUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;

var initialFontPropertyValues = {
    'font-style': 'normal',
    'font-weight': 400,
    'font-stretch': 'normal'
};

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
    var fontDomainPreconnect = new AssetGraph.HtmlPreconnectLink({
        hrefType: 'absolute',
        from: htmlAsset,
        to: { url: 'https://fonts.gstatic.com' }
    });

    fontDomainPreconnect.attach(htmlAsset, 'after', injectionPointRelation);

    // Resource hint: prefetch google font stylesheet
    var parsedOriginalUrl = url.parse(originalRelation.to.url);
    var cssDomainPreconnect = new AssetGraph.HtmlPreconnectLink({
        hrefType: 'absolute',
        from: htmlAsset,
        to: { url: 'https://' + parsedOriginalUrl.host }
    });

    cssDomainPreconnect.attach(htmlAsset, 'before', fontDomainPreconnect);


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

    asyncCssLoadingRelation.to.minify();
    htmlAsset.markDirty();
}

function getSubsetPromiseId(fontUsage, format) {
    return [
        fontUsage.text,
        fontUsage.props.src,
        format
    ].join('\x1d');
}

function getSubsetsForFontUsage(assetGraph, htmlAssetTextsWithProps, formats) {
    var subsetLocalFont;

    try {
        subsetLocalFont = require('../util/fonts/subsetLocalFont');
    } catch (err) {
        assetGraph.emit('warn', err);
    }

    var allFonts = [];

    htmlAssetTextsWithProps.forEach(function (item) {
        item.fontUsages.forEach(function (fontUsage) {
            if (allFonts.indexOf(fontUsage.props.src) === -1) {
                allFonts.push(fontUsage.props.src);
            }

            var fontRelation = assetGraph.findRelations({ type: 'CssFontFaceSrc', to: { url: fontUsage.props.src }}, true)[0];

            if (fontRelation) {
                var localRegex = /(?:local\(')(.+)(?:'\))/;
                fontUsage.localFamilyNames = fontRelation.propertyNode.value.split(',')
                    .map(function (str) {
                        var match = str.match(localRegex);
                        return match && match[1];
                    })
                    .filter(function (str) { return str; });
            }

        });
    });

    if (subsetLocalFont) {
        return assetGraph
            .populate({
                followRelations: {
                    to: {
                        url: allFonts
                    }
                }
            })
            .then(function (assetGraph) {
                var originalFontBuffers = allFonts.reduce(function (result, fontUrl) {
                    var fontAsset = assetGraph.findAssets({ url: fontUrl })[0];

                    if (fontAsset) {
                        result[fontUrl] = fontAsset.rawSrc;
                    }

                    return result;
                }, {});

                var subsetPromiseMap = {};

                var missingCharsByFontSrc = {};
                htmlAssetTextsWithProps.forEach(function (item) {
                    item.fontUsages.forEach(function (fontUsage) {
                        var fontBuffer = originalFontBuffers[fontUsage.props.src];
                        var text = fontUsage.text;
                        formats.forEach(function (format) {
                            var promiseId = getSubsetPromiseId(fontUsage, format);

                            if (!subsetPromiseMap[promiseId]) {
                                subsetPromiseMap[promiseId] = subsetLocalFont(fontBuffer, format, text)
                                    .catch(function (err) {
                                        var error = new Error(err.message);
                                        error.asset = assetGraph.findAssets({ url: fontUsage.props.src })[0];

                                        assetGraph.emit('warn', error);
                                    });
                            }

                            subsetPromiseMap[promiseId].then(function (result) {
                                if (result) {
                                    if (result.missingChars.length > 0) {
                                        missingCharsByFontSrc[fontUsage.props.src] =
                                            result.missingChars.concat(missingCharsByFontSrc[fontUsage.props.src] || []);
                                    }

                                    if (!fontUsage.subsets) {
                                        fontUsage.subsets = {};
                                    }
                                    fontUsage.subsets[format] = result.buffer;
                                }
                            });
                        });
                    });
                });

                return Promise.all(_.values(subsetPromiseMap))
                    .tap(function () {
                        Object.keys(missingCharsByFontSrc).forEach(function (fontSrc) {
                            assetGraph.emit('warn', new Error(
                                'The font ' + fontSrc + ' is missing these characters: ' +
                                _.uniq(missingCharsByFontSrc[fontSrc]).join('') + '\n' +
                                'Under these circumstances the subsetting strategy will load both the subset, the original font,\n' +
                                'as well as any additional fallbacks you might have in font-family\n' +
                                'Please make sure that the highest prioritized font-family that applies to the elements\n' +
                                'containing those characters does include them.'
                            ));
                        });
                    });
            });
    } else {
        var fontCssUrlMap = {};

        htmlAssetTextsWithProps.forEach(function (item) {
            item.fontUsages.forEach(function (fontUsage) {
                if (fontUsage.props.src.indexOf('//fonts.gstatic.com') === -1) {
                    return;
                }

                formats.forEach(function (format) {
                    var mapId = getSubsetPromiseId(fontUsage, format);

                    if (!fontCssUrlMap[mapId]) {
                        fontCssUrlMap[mapId] = getGoogleFontSubsetCssUrl(fontUsage.props, fontUsage.text) + '&format=' + format;
                    }
                });
            });
        });

        var queue = new AssetGraph()
            .queue();

        formats.forEach(function (format) {
            var formatUrls = _.uniq(_.values(fontCssUrlMap).filter(function (url) { return url.endsWith('format=' + format); }));
            queue
                .queue(function (assetGraph) {
                    assetGraph.teepee.headers['User-Agent'] = fontFormatUA[format];
                })
                .loadAssets(_.values(formatUrls));
        });

        return queue
            .populate({
                followRelations: {
                    type: 'CssFontFaceSrc'
                }
            })
            .then(function (assetGraph) {
                htmlAssetTextsWithProps.forEach(function (item) {
                    item.fontUsages.forEach(function (fontUsage) {
                        formats.forEach(function (format) {
                            var cssUrl = fontCssUrlMap[getSubsetPromiseId(fontUsage, format)];
                            var cssAsset = assetGraph.findAssets({ url: cssUrl, isLoaded: true })[0];

                            if (cssAsset) {
                                var fontRelation = cssAsset.outgoingRelations[0];
                                var fontAsset = fontRelation.to;

                                if (fontAsset.isLoaded) {
                                    if (!fontUsage.subsets) {
                                        fontUsage.subsets = {};
                                    }

                                    fontUsage.subsets[format] = fontAsset.rawSrc;
                                }
                            }
                        });
                    });
                });
            });
    }
}

var fontContentTypeMap = {
    woff: 'font/woff', // https://tools.ietf.org/html/rfc8081#section-4.4.5
    woff2: 'font/woff2'
};

var fontOrder = ['woff2', 'woff'];

var getFontFaceForFontUsage = memoizeSync(function (fontUsage) {
    var subsets = fontOrder
        .filter(function (format) { return fontUsage.subsets[format]; })
        .map(function (format) {
            var buffer = fontUsage.subsets[format];

            return {
                format: format,
                url: 'data:' + fontContentTypeMap[format] + ';base64,' + buffer.toString('base64')
            };
        });

    var resultString = ['@font-face {'];

    resultString.push.apply(resultString, Object.keys(fontUsage.props)
        .sort()
        .map(function (prop) {
            var value = fontUsage.props[prop];

            if (prop === 'font-family') {
                value = cssQuoteIfNecessary(value + '__subset');
            }

            if (prop === 'src') {
                value = (fontUsage.localFamilyNames || [])
                    .map(function (name) { return 'local(\'' + name + '\')'; })
                    .concat(subsets.map(function (subset) { return 'url(' + subset.url + ') format(\'' + subset.format + '\')'; }))
                    .join(', ');
            }

            return prop + ': ' + value + ';';
        })
        .map(function (str) { return '  ' + str; })
    );

    resultString.push('}');

    return resultString.join('\n');
}, {
    argumentsStringifier: function (args) {
        return [args[0].text, args[0].props, args[1]]
            .map(function (arg) {
                return JSON.stringify(arg);
            })
            .join('\x1d');
    }
});

function getFontUsageStylesheet(fontUsages) {
    var stylesheet = fontUsages
        .filter(function (fontUsage) { return fontUsage.subsets; })
        .map(function (fontUsage) {
            return getFontFaceForFontUsage(fontUsage);
        })
        .join('\n\n');

    return stylesheet;
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
    var formats = options.formats || ['woff2', 'woff'];
    var subsetPerPage = !!options.subsetPerPage;
    var inlineSubsets = !!options.inlineSubsets;
    var inlineCss = !!options.inlineCss;
    var fontDisplay = validFontDisplayValues.indexOf(options.fontDisplay) !== -1 && options.fontDisplay;

    return function subsetFonts(assetGraph, cb) {
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
                        if (asset.type === 'Css' && asset.isLoaded) {
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

                if (fontDisplay) {
                    htmlAssetTextsWithProps.forEach(function (htmlAssetTextWithProps) {
                        htmlAssetTextWithProps.fontUsages.forEach(function (fontUsage) {
                            fontUsage.props['font-display'] = fontDisplay;
                        });
                    });
                }
            })
            .queue(function generateSubsets(assetGraph) {
                return getSubsetsForFontUsage(assetGraph, htmlAssetTextsWithProps, formats);
            })
            .queue(function insertSubsets(assetGraph) {
                var cssAssetMap = {};

                htmlAssetTextsWithProps
                    .forEach(function (htmlAssetTextWithProps) {
                        var htmlAsset = htmlAssetTextWithProps.htmlAsset;
                        var insertionPoint = assetGraph.findRelations({ type: 'HtmlStyle', from: htmlAsset })[0];
                        var fontUsages = htmlAssetTextWithProps.fontUsages;
                        var subsetFontUsages = fontUsages.filter(function (fontUsage) { return fontUsage.subsets; });
                        var unsubsettedFontUsages = fontUsages.filter(function (fontUsage) { return subsetFontUsages.indexOf(fontUsage) === -1; });

                        // Remove all existing preload hints to fonts that might have new subsets
                        fontUsages.forEach(function (fontUsage) {
                            assetGraph.findRelations({
                                type: ['HtmlPrefetchLink', 'HtmlPreloadLink'],
                                from: htmlAsset,
                                to: {
                                    url: fontUsage.props.src
                                }
                            })
                            .forEach(function (relation) {
                                if (relation.type === 'HtmlPrefetchLink') {
                                    var err = new Error('Detached ' + relation.node.outerHTML + '. Will be replaced with preload with JS fallback.\nIf you feel this is wrong, open an issue at https://github.com/assetgraph/assetgraph/issues');
                                    err.asset = relation.from;
                                    err.relation = relation;

                                    assetGraph.emit('info', err);
                                }

                                relation.detach();
                            });
                        });

                        if (unsubsettedFontUsages.length > 0) {
                            // Insert <link rel="preload">
                            var preloadRelations = unsubsettedFontUsages.map(function (fontUsage) {
                                var fontAsset = assetGraph.findAssets({ url: fontUsage.props.src })[0];

                                // Always preload unsubsetted font files, they might be any format, so can't be clever here
                                var preloadHint = new AssetGraph.HtmlPreloadLink({
                                    hrefType: 'rootRelative',
                                    to: fontAsset,
                                    as: 'font'
                                });
                                preloadHint.attach(htmlAsset, 'before', insertionPoint);
                                return preloadHint;
                            });

                            // Generate JS fallback for browser that don't support <link rel="preload">
                            var preloadData = unsubsettedFontUsages.map(function (fontUsage, idx) {
                                var preloadRelation = preloadRelations[idx];

                                var formatMap = {
                                    '.woff': 'woff',
                                    '.woff2': 'woff2',
                                    '.ttf': 'truetype',
                                    '.svg': 'svg',
                                    '.eot': 'embedded-opentype'
                                };
                                var name = fontUsage.props['font-family'];
                                var url = 'url(\'"+"' + preloadRelation.href + '".toString(\'url\')+"\') format(\'' + formatMap[preloadRelation.to.extension] + '\')';
                                var props = Object.keys(initialFontPropertyValues).reduce(function (result, prop) {
                                    if (fontUsage.props[prop] !== initialFontPropertyValues[prop]) {
                                        result[prop] = fontUsage.props[prop];
                                    }

                                    return result;
                                }, {});

                                return 'new FontFace("' + name + '", "' + url + '", ' + JSON.stringify(props) + ').load();';
                            });

                            var originalFontJsPreloadAsset = new AssetGraph.JavaScript(assetGraph.resolveAssetConfig({
                                text: 'try{' + preloadData.join('') + '}catch(e){}'
                            }));
                            assetGraph.addAsset(originalFontJsPreloadAsset);

                            new AssetGraph.HtmlScript({ to: originalFontJsPreloadAsset }).attach(htmlAsset, 'before', insertionPoint);

                            originalFontJsPreloadAsset.outgoingRelations.forEach(function (rel, idx) {
                                rel.hrefType = 'rootRelative';
                                rel.to = preloadRelations[idx].to;
                                rel.refreshHref();
                            });

                            originalFontJsPreloadAsset.minify();
                        }

                        if (subsetFontUsages.length < 1) {
                            return;
                        }

                        var subsetCssText = getFontUsageStylesheet(subsetFontUsages);
                        var cssAsset = cssAssetMap[subsetCssText];

                        if (!cssAsset) {
                            cssAsset = new AssetGraph.Css(assetGraph.resolveAssetConfig({
                                type: 'Css',
                                url: subsetPath + 'subfontTemp.css',
                                text: subsetCssText
                            }));

                            assetGraph.addAsset(cssAsset);

                            cssAssetMap[subsetCssText] = cssAsset;

                            if (!inlineSubsets) {
                                cssAsset.outgoingRelations.forEach(function (fontRelation) {
                                    var fontAsset = fontRelation.to;
                                    var extension = fontAsset.contentType.split('/').pop();

                                    var nameProps = ['font-family', 'font-weight', 'font-style']
                                        .map(function (prop) {
                                            return fontRelation.node.nodes.find(function (decl) {
                                                return decl.prop === prop;
                                            });
                                        })
                                        .map(function (decl) { return decl.value; });

                                    var fileNamePreFix = [
                                        unquote(nameProps[0]).replace(/__subset$/, '').replace(/ /g, '_') + '-',
                                        nameProps[1],
                                        nameProps[2] === 'italic' ? 'i' : ''
                                    ].join('');

                                    var fontFileName = fileNamePreFix + '-' + fontAsset.md5Hex.slice(0, 10) + '.' + extension;

                                    fontAsset.url = subsetPath + fontFileName;

                                    if (inlineCss) {
                                        fontRelation.hrefType = 'rootRelative';
                                    } else {
                                        fontRelation.hrefType = 'relative';
                                    }
                                });
                            }

                            var cssFileName = 'fonts-' + cssAsset.md5Hex.slice(0, 10) + '.css';
                            cssAsset.url = subsetPath + cssFileName;
                        }

                        if (!inlineSubsets) {
                            cssAsset.outgoingRelations.forEach(function (fontRelation) {
                                var fontAsset = fontRelation.to;

                                if (fontAsset.contentType === 'font/woff2') {
                                    // Only <link rel="preload"> for woff2 files
                                    // Preload support is a subset of woff2 support:
                                    // - https://caniuse.com/#search=woff2
                                    // - https://caniuse.com/#search=preload

                                    var preloadRelation = new AssetGraph.HtmlPreloadLink({
                                        hrefType: 'rootRelative',
                                        to: fontAsset,
                                        as: 'font'
                                    });

                                    preloadRelation.attach(htmlAsset, 'before', insertionPoint);
                                }
                            });
                        }

                        var cssRelation = new AssetGraph.HtmlStyle({
                            hrefType: 'rootRelative',
                            to: cssAsset
                        });

                        cssRelation.attach(htmlAsset, 'before', insertionPoint);

                        if (inlineCss) {
                            cssRelation.inline();
                        }

                        cssAsset.minify();

                        // JS-based font preloading for browsers without <link rel="preload"> support
                        if (inlineCss) {
                            // If the CSS is inlined we can use the font declarations directly to load the fonts
                            var jsPreloadInlineAsset = new AssetGraph.JavaScript(assetGraph.resolveAssetConfig({
                                text: 'try { document.fonts.forEach(function (f) { f.family.indexOf("__subset") !== -1 && f.load(); }); } catch (e) {}'
                            }));
                            assetGraph.addAsset(jsPreloadInlineAsset);

                            new AssetGraph.HtmlScript({
                                to: jsPreloadInlineAsset
                            }).attach(htmlAsset, 'after', cssRelation);

                            jsPreloadInlineAsset.minify();
                        } else {
                            // The CSS is external, can't use the font face declarations without waiting for a blocking load.
                            // Go for direct FontFace construction instead
                            var fontFaceContructorCalls = [];

                            cssAsset.parseTree.walkAtRules('font-face', function (rule) {
                                var name;
                                var url;
                                var props = {};

                                rule.walkDecls(function (declaration) {
                                    var prop = declaration.prop;
                                    var value = declaration.value;

                                    if (prop === 'font-weight') {
                                        value = Number(value) || value;
                                    }

                                    if (prop in initialFontPropertyValues) {
                                        if (value !== initialFontPropertyValues[prop]) {
                                            props[prop] = value;
                                        }
                                    }

                                    if (prop === 'font-family') {
                                        name = value;
                                    }

                                    if (prop === 'src') {
                                        var fontRelations = cssAsset.outgoingRelations.filter(function (rel) { return rel.node === rule; });
                                        var urlStrings = value
                                            .split(', ')
                                            .filter(function (entry) {
                                                return entry.indexOf('url(') === 0;
                                            });

                                        var urlValues = urlStrings.map(function (urlString, idx) {
                                            return urlString.replace(fontRelations[idx].href, '\'" + "/__subfont__".toString("url") + "\'');
                                        });

                                        url = '"' + urlValues.join(', ') + '"';
                                    }

                                });

                                fontFaceContructorCalls.push('new FontFace(' + name + ', ' + url + ', ' + JSON.stringify(props) + ').load();');
                            });

                            var jsPreloadAsset = new AssetGraph.JavaScript(assetGraph.resolveAssetConfig({
                                text: 'try {' + fontFaceContructorCalls.join('') + '} catch (e) {}'
                            }));
                            assetGraph.addAsset(jsPreloadAsset);

                            new AssetGraph.HtmlScript({
                                to: jsPreloadAsset
                            }).attach(htmlAsset, 'before', cssRelation);

                            jsPreloadAsset.outgoingRelations.forEach(function (rel, idx) {
                                rel.to = cssAsset.outgoingRelations[idx].to;
                                rel.hrefType = 'rootRelative';
                                rel.refreshHref();
                            });

                            jsPreloadAsset.minify();
                        }
                    });
            })
            .queue(function asyncLoadGoogleFontCss(assetGraph) {
                var googleFontStylesheets = assetGraph.findAssets({
                    type: 'Css',
                    url: googleFontsCssUrlRegex
                });

                googleFontStylesheets.forEach(function (googleFontStylesheet) {
                    googleFontStylesheet.incomingRelations.forEach(function (googleFontStylesheetRelation) {
                        var htmlParents = [googleFontStylesheetRelation.from];

                        if (googleFontStylesheetRelation.type === 'CssImport') {
                            // Gather Html parents. Relevant if we are dealing with CSS @import relations
                            htmlParents = getParents(assetGraph, googleFontStylesheetRelation.to, {
                                type: 'Html',
                                isInline: false,
                                isLoaded: true
                            });
                        }

                        htmlParents.forEach(function (htmlParent) {
                            asyncLoadStyleRelationWithFallback(htmlParent, googleFontStylesheetRelation, htmlParent.outgoingRelations.find(function (relation) {
                                return relation.type === 'HtmlStyle';
                            }));
                        });
                    });

                    assetGraph.removeAsset(googleFontStylesheet);
                });
            })
            .queue(function useSubsetsInFontFamily() {
                var webfontNameMap = htmlAssetTextsWithProps
                    .map(function (pageObject) {
                        return pageObject.fontUsages
                            .filter(function (fontUsage) { return fontUsage.subsets; })
                            .map(function (fontUsage) {
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
                        }
                    });
                    if (changesMade) {
                        cssAsset.markDirty();
                    }
                });
            })
            .run(cb);
    };
};

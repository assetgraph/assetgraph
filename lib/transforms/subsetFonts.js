const _ = require('lodash');
const url = require('url');
const Promise = require('bluebird');
const memoizeSync = require('memoizesync');
const urltools = require('urltools');
const compileQuery = require('../compileQuery');

const AssetGraph = require('../../');

const getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
const getGoogleIdForFontProps = require('../util/fonts/getGoogleIdForFontProps');
const snapToAvailableFontProperties = require('../util/fonts/snapToAvailableFontProperties');
const cssListHelpers = require('css-list-helpers');
const cssFontWeightNames = require('css-font-weight-names');
const unquote = require('../util/fonts/unquote');
const getCssRulesByProperty = require('../util/fonts/getCssRulesByProperty');

const opentype = require('opentype');

const googleFontsCssUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;

const initialFontPropertyValues = {
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
    const googleFontId = getGoogleIdForFontProps(fontProps);

    return 'https://fonts.googleapis.com/css?family=' + googleFontId + '&text=' + encodeURIComponent(text);
}

function getPreferredFontUrl(cssFontFaceSrcRelations = []) {
    const formatOrder = [
        'woff2',
        'woff',
        'truetype',
        'opentype'
    ];

    const typeOrder = [
        'Woff2',
        'Woff',
        'Ttf',
        'Otf'
    ];

    for (const format of formatOrder) {
        const relation = cssFontFaceSrcRelations.find(r => r.format && r.format.toLowerCase() === format);

        if (relation) {
            return relation.to.url;
        }
    }

    for (const assetType of typeOrder) {
        const relation = cssFontFaceSrcRelations.find(r => r.to.type === assetType);

        if (relation) {
            return relation.to.url;
        }
    }
}

// Takes the output of util/fonts/getTextByFontProperties
function groupTextsByFontFamilyProps(textByPropsArray, availableFontFaceDeclarations) {
    const snappedTexts = textByPropsArray
        .map(textAndProps => {
            const activeFontFaceDeclaration = snapToAvailableFontProperties(availableFontFaceDeclarations, textAndProps.props);

            if (!activeFontFaceDeclaration) {
                return null;
            }

            const { relations, ...props } = activeFontFaceDeclaration;
            const fontUrl = getPreferredFontUrl(relations);

            return {
                text: textAndProps.text,
                props,
                fontRelations: relations,
                fontUrl
            };
        })
        .filter(textByProps => textByProps && textByProps.fontUrl);

    const textsByFontUrl = _.groupBy(snappedTexts, 'fontUrl');

    return _.map(textsByFontUrl, function (textsPropsArray, fontUrl) {
        const texts = textsPropsArray.map(obj => obj.text);
        const pageText = _.uniq(texts.join(''))
            .sort()
            .join('');

        return {
            texts,
            pageText,
            text: pageText,
            props: {...textsPropsArray[0].props},
            fontUrl
        };
    });
}

function getParents(assetGraph, asset, assetQuery) {
    const assetMatcher = compileQuery(assetQuery);
    const seenAssets = new Set();
    const parents = [];
    (function visit(asset) {
        if (seenAssets.has(asset)) {
            return;
        }
        seenAssets.add(asset);

        for (const incomingRelation of asset.incomingRelations) {
            if (assetMatcher(incomingRelation.from)) {
                parents.push(incomingRelation.from);
            } else {
                visit(incomingRelation.from);
            }
        }
    }(asset));

    return parents;
}

function asyncLoadStyleRelationWithFallback(htmlAsset, originalRelation, insertPoint) {
    const injectionPointRelation = insertPoint || htmlAsset.outgoingRelations[0];
    // Resource hint: prefetch google font stylesheet
    const fontDomainPreconnect = htmlAsset.addRelation({
        type: 'HtmlPreconnectLink',
        hrefType: 'absolute',
        to: { url: 'https://fonts.gstatic.com' }
    }, 'after', injectionPointRelation);

    // Resource hint: prefetch google font stylesheet
    const parsedOriginalUrl = url.parse(originalRelation.to.url);
    htmlAsset.addRelation({
        type: 'HtmlPreconnectLink',
        hrefType: 'absolute',
        to: { url: 'https://' + parsedOriginalUrl.host }
    }, 'before', fontDomainPreconnect);

    // Async load google font stylesheet
    // Insert async CSS loading <script>
    const asyncCssLoadingRelation = htmlAsset.addRelation({
        type: 'HtmlScript',
        hrefType: 'inline',
        to: {
            type: 'JavaScript',
            text: `
                (function () {
                    var el = document.createElement('link');
                    el.href = '${originalRelation.to.url}'.toString('url');
                    el.rel = 'stylesheet';
                    ${ originalRelation.media ? `el.media = '${originalRelation.media}';` : '' }
                    document.body.appendChild(el);
                }())
            `
        }
    }, 'lastInBody');


    // Insert <noscript> fallback sync CSS loading
    const noScriptFallbackRelation = htmlAsset.addRelation({
        type: 'HtmlNoscript',
        to: {
            type: 'Html',
            text: ''
        }
    }, 'lastInBody');

    noScriptFallbackRelation.to.addRelation({
        type: 'HtmlStyle',
        media: originalRelation.media,
        to: originalRelation.to
    }, 'last');

    noScriptFallbackRelation.inline();

    // Clean up
    originalRelation.detach();

    asyncCssLoadingRelation.to.minify();
    htmlAsset.markDirty();
}

function getSubsetPromiseId(fontUsage, format) {
    return [
        fontUsage.text,
        fontUsage.fontUrl,
        format
    ].join('\x1d');
}

const localRegex = /(?:local\(')(.+)(?:'\))/;
async function getSubsetsForFontUsage(assetGraph, htmlAssetTextsWithProps, formats) {
    let subsetLocalFont;

    try {
        subsetLocalFont = require('../util/fonts/subsetLocalFont');
    } catch (err) {
        assetGraph.warn(err);
    }

    const allFonts = [];

    for (const item of htmlAssetTextsWithProps) {
        for (const fontUsage of item.fontUsages) {
            if (!fontUsage.fontUrl) {
                continue;
            }

            if (allFonts.indexOf(fontUsage.fontUrl) === -1) {
                allFonts.push(fontUsage.fontUrl);
            }

            const fontRelation = assetGraph.findRelations({ type: 'CssFontFaceSrc', to: { url: fontUsage.fontUrl }})[0];

            if (fontRelation) {
                fontUsage.localFamilyNames = fontRelation.propertyNode.value.split(',')
                    .map(str => {
                        const match = str.match(localRegex);
                        return match && match[1];
                    })
                    .filter(str => str);
            }
        }
    }

    if (subsetLocalFont) {
        await assetGraph.populate({
            followRelations: {
                to: { url: { $or: allFonts } }
            }
        });

        const originalFontBuffers = allFonts.reduce((result, fontUrl) => {
            const fontAsset = assetGraph.findAssets({ url: fontUrl })[0];

            if (fontAsset) {
                result[fontUrl] = fontAsset.rawSrc;
            }

            return result;
        }, {});

        const subsetPromiseMap = {};

        const missingCharsByFontSrc = {};
        for (const item of htmlAssetTextsWithProps) {
            for (const fontUsage of item.fontUsages) {
                const fontBuffer = originalFontBuffers[fontUsage.fontUrl];
                const text = fontUsage.text;
                for (const format of formats) {
                    const promiseId = getSubsetPromiseId(fontUsage, format);

                    if (!subsetPromiseMap[promiseId]) {
                        subsetPromiseMap[promiseId] = subsetLocalFont(fontBuffer, format, text)
                            .catch(err => {
                                const error = new Error(err.message);
                                error.asset = assetGraph.findAssets({ url: fontUsage.fontUrl })[0];

                                assetGraph.warn(error);
                            });
                    }

                    subsetPromiseMap[promiseId].then(result => {
                        if (result) {
                            if (result.missingChars.length > 0) {
                                missingCharsByFontSrc[fontUsage.fontUrl] = [
                                    ...result.missingChars,
                                    ...(missingCharsByFontSrc[fontUsage.fontUrl] || [])
                                ];
                            }

                            if (!fontUsage.subsets) {
                                fontUsage.subsets = {};
                            }
                            fontUsage.subsets[format] = result.buffer;
                        }
                    });
                }
            }
        }

        await Promise.all(_.values(subsetPromiseMap));
    } else {
        const fontCssUrlMap = {};

        for (const item of htmlAssetTextsWithProps) {
            for (const fontUsage of item.fontUsages) {
                if (!fontUsage.fontUrl) {
                    continue;
                }

                const fontAsset = assetGraph.findAssets({ url: fontUsage.fontUrl })[0];

                if (fontAsset.hostname !== 'fonts.gstatic.com') {
                    continue;
                }

                for (const format of formats) {
                    const mapId = getSubsetPromiseId(fontUsage, format);

                    if (!fontCssUrlMap[mapId]) {
                        fontCssUrlMap[mapId] = getGoogleFontSubsetCssUrl(fontUsage.props, fontUsage.text) + '&format=' + format;
                    }
                }
            }
        }

        const assetGraphForLoadingFonts = new AssetGraph();

        for (const format of formats) {
            assetGraphForLoadingFonts.teepee.headers['User-Agent'] = fontFormatUA[format];
            const formatUrls = _.uniq(
                _.values(fontCssUrlMap)
                    .filter(url => url.endsWith('format=' + format))
            );
            await assetGraphForLoadingFonts.loadAssets(_.values(formatUrls));
        }

        await assetGraphForLoadingFonts.populate({
            followRelations: {
                type: 'CssFontFaceSrc'
            }
        });

        for (const item of htmlAssetTextsWithProps) {
            for (const fontUsage of item.fontUsages) {
                for (const format of formats) {
                    const cssUrl = fontCssUrlMap[getSubsetPromiseId(fontUsage, format)];
                    const cssAsset = assetGraphForLoadingFonts.findAssets({ url: cssUrl, isLoaded: true })[0];
                    if (cssAsset) {
                        const fontRelation = cssAsset.outgoingRelations[0];
                        const fontAsset = fontRelation.to;

                        if (fontAsset.isLoaded) {
                            if (!fontUsage.subsets) {
                                fontUsage.subsets = {};
                            }

                            fontUsage.subsets[format] = fontAsset.rawSrc;
                        }
                    }
                }
            }
        }
    }
}

const fontContentTypeMap = {
    woff: 'font/woff', // https://tools.ietf.org/html/rfc8081#section-4.4.5
    woff2: 'font/woff2'
};

const fontOrder = ['woff2', 'woff'];

const getFontFaceForFontUsage = memoizeSync(fontUsage => {
    const subsets = fontOrder
        .filter(format => fontUsage.subsets[format])
        .map(format => ({
            format,
            url: 'data:' + fontContentTypeMap[format] + ';base64,' + fontUsage.subsets[format].toString('base64')
        }));

    const resultString = ['@font-face {'];

    resultString.push(...Object.keys(fontUsage.props)
        .sort()
        .map(prop => {
            let value = fontUsage.props[prop];

            if (prop === 'font-family') {
                value = cssQuoteIfNecessary(value + '__subset');
            }

            if (prop === 'src') {
                value = (fontUsage.localFamilyNames || [])
                    .map(name => 'local(\'' + name + '\')')
                    .concat(subsets.map(subset => `url(${subset.url}) format('${subset.format}')`))
                    .join(', ');
            }

            return prop + ': ' + value + ';';
        })
        .map(str => '  ' + str)
    );

    resultString.push('}');

    return resultString.join('\n');
}, {
    argumentsStringifier: args => {
        return [args[0].text, args[0].props, args[1]]
            .map(arg => JSON.stringify(arg))
            .join('\x1d');
    }
});

function getFontUsageStylesheet(fontUsages) {
    return fontUsages
        .filter(fontUsage => fontUsage.subsets)
        .map(fontUsage => getFontFaceForFontUsage(fontUsage))
        .join('\n\n');
}

const fontFormatUA = {
    woff: 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0',
    woff2: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36'
};

const validFontDisplayValues = [
    'auto',
    'block',
    'swap',
    'fallback',
    'optional'
];

module.exports = ({
    formats = ['woff2', 'woff'],
    subsetPath = 'subfont/',
    subsetPerPage,
    inlineSubsets,
    inlineCss,
    fontDisplay
} = {}) => {
    if (!validFontDisplayValues.includes(fontDisplay)) {
        fontDisplay = undefined;
    }

    return async function subsetFonts(assetGraph) {
        const htmlAssetTextsWithProps = [];
        const subsetUrl = urltools.ensureTrailingSlash(assetGraph.root + subsetPath);

        await assetGraph.populate({
            followRelations: {
                to: {
                    url: googleFontsCssUrlRegex
                }
            }
        });

        // Collect texts by page

        const memoizedGetCssRulesByProperty = memoizeSync(getCssRulesByProperty);
        const htmlAssets = assetGraph.findAssets({ type: 'Html', isInline: false });
        const traversalRelationQuery = {
            $or: [
                {
                    type: {$in: ['HtmlStyle', 'CssImport']}
                },
                {
                    to: {
                        type: 'Html',
                        isInline: true
                    }
                }
            ]
        };

        for (const htmlAsset of htmlAssets) {
            const accumulatedFontFaceDeclarations = [];

            assetGraph.eachAssetPreOrder(htmlAsset, traversalRelationQuery, asset => {
                if (asset.type === 'Css' && asset.isLoaded) {
                    const seenNodes = new Set();

                    const fontRelations = asset.outgoingRelations
                        .filter(relation => relation.type === 'CssFontFaceSrc');

                    for (const fontRelation of fontRelations) {
                        const node = fontRelation.node;

                        if (!seenNodes.has(node)) {
                            seenNodes.add(node);

                            const fontFaceDeclaration = {
                                relations: fontRelations.filter(r => r.node === node)
                            };

                            node.walkDecls(declaration => {
                                if (declaration.prop === 'font-weight') {
                                    fontFaceDeclaration[declaration.prop] = cssFontWeightNames[declaration.value] || parseInt(declaration.value, 10);
                                } else {
                                    fontFaceDeclaration[declaration.prop] = unquote(declaration.value);
                                }
                            });

                            accumulatedFontFaceDeclarations.push(fontFaceDeclaration);
                        }
                    }
                }
            });

            if (accumulatedFontFaceDeclarations.length > 0) {
                const textByProps = getTextByFontProperties(htmlAsset, memoizedGetCssRulesByProperty);

                htmlAssetTextsWithProps.push({
                    htmlAsset,
                    fontUsages: groupTextsByFontFamilyProps(textByProps, accumulatedFontFaceDeclarations)
                });
            }
        }

        if (htmlAssetTextsWithProps.length <= 1) {
            subsetPerPage = false;
        }

        if (!subsetPerPage) {
            const globalFontUsage = {};

            // Gather all texts
            for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
                for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
                    if (!globalFontUsage[fontUsage.fontUrl]) {
                        globalFontUsage[fontUsage.fontUrl] = [];
                    }

                    globalFontUsage[fontUsage.fontUrl].push(fontUsage.text);
                }
            }

            // Merge subset values, unique glyphs, sort
            for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
                for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
                    fontUsage.text = _.uniq(globalFontUsage[fontUsage.fontUrl].join(''))
                        .sort()
                        .join('');
                }
            }
        }

        if (fontDisplay) {
            for (const htmlAssetTextWithProps of htmlAssetTextsWithProps) {
                for (const fontUsage of htmlAssetTextWithProps.fontUsages) {
                    fontUsage.props['font-display'] = fontDisplay;
                }
            }
        }

        // Generate subsets:

        await getSubsetsForFontUsage(assetGraph, htmlAssetTextsWithProps, formats);

        // Warn about missing glyphs
        const missingGlyphsErrors = [];
        const getUnicodeRanges = require('../util/fonts/unicode-range');

        for (const { htmlAsset, fontUsages } of htmlAssetTextsWithProps) {
            for (const fontUsage of fontUsages) {
                if (fontUsage.fontUrl) {
                    const originalFont = opentype.parse(assetGraph.findAssets({ url: fontUsage.fontUrl })[0].rawSrc);
                    const originalRange = getUnicodeRanges(Object.keys(originalFont.tables.cmap[0].charCodes).map(Number));

                    console.log(fontUsage.fontUrl, originalRange);
                }

                if (fontUsage.subsets) {
                    const font = opentype.parse(fontUsage.subsets.woff);
                    const cmaps = font.tables && font.tables.cmap;

                    if (cmaps) {
                        for (const char of [...fontUsage.pageText]) {
                            const codePoint = char.codePointAt(0);

                            const isMissing = cmaps.every(cmap => !(codePoint in cmap.charCodes));

                            if (isMissing) {
                                missingGlyphsErrors.push({
                                    codePoint,
                                    char,
                                    htmlAsset,
                                    fontUsage
                                });
                            }
                        }
                    }
                }
            }
        }

        if (missingGlyphsErrors.length) {

            assetGraph.warn(new Error(
                'The font ' + fontSrc + ' is missing these characters: ' +
                _.uniq(missingCharsByFontSrc[fontSrc]).join('') + '\n' +
                'Under these circumstances the subsetting strategy will load both the subset, the original font,\n' +
                'as well as any additional fallbacks you might have in font-family\n' +
                'Please make sure that the highest prioritized font-family that applies to the elements\n' +
                'containing those characters does include them.'
            ));
        }

        // Insert subsets:

        const cssAssetMap = {};

        for (const { htmlAsset, fontUsages } of htmlAssetTextsWithProps) {
            const insertionPoint = assetGraph.findRelations({ type: 'HtmlStyle', from: htmlAsset })[0];
            const subsetFontUsages = fontUsages
                .filter(fontUsage => fontUsage.subsets);
            const unsubsettedFontUsages = fontUsages
                .filter(fontUsage => !subsetFontUsages.includes(fontUsage));

            // Remove all existing preload hints to fonts that might have new subsets
            for (const fontUsage of fontUsages) {
                for (const relation of assetGraph.findRelations({
                    type: {$or: ['HtmlPrefetchLink', 'HtmlPreloadLink']},
                    from: htmlAsset,
                    to: {
                        url: fontUsage.fontUrl
                    }
                })) {
                    if (relation.type === 'HtmlPrefetchLink') {
                        const err = new Error(`Detached ${relation.node.outerHTML}. Will be replaced with preload with JS fallback.\nIf you feel this is wrong, open an issue at https://github.com/assetgraph/assetgraph/issues`);
                        err.asset = relation.from;
                        err.relation = relation;

                        assetGraph.info(err);
                    }

                    relation.detach();
                }
            }

            if (unsubsettedFontUsages.length > 0) {
                // Insert <link rel="preload">
                const preloadRelations = unsubsettedFontUsages.map(fontUsage => {
                    // Always preload unsubsetted font files, they might be any format, so can't be clever here
                    return htmlAsset.addRelation({
                        type: 'HtmlPreloadLink',
                        hrefType: 'rootRelative',
                        to: fontUsage.fontUrl,
                        as: 'font'
                    }, 'before', insertionPoint);
                });

                // Generate JS fallback for browser that don't support <link rel="preload">
                const preloadData = unsubsettedFontUsages.map((fontUsage, idx) => {
                    const preloadRelation = preloadRelations[idx];

                    const formatMap = {
                        '.woff': 'woff',
                        '.woff2': 'woff2',
                        '.ttf': 'truetype',
                        '.svg': 'svg',
                        '.eot': 'embedded-opentype'
                    };
                    const name = fontUsage.props['font-family'];
                    const props = Object.keys(initialFontPropertyValues).reduce(
                        (result, prop) => {
                            if (fontUsage.props[prop] !== initialFontPropertyValues[prop]) {
                                result[prop] = fontUsage.props[prop];
                            }
                            return result;
                        },
                        {}
                    );

                    return `new FontFace(
                        "${name}",
                        "url('" + "${preloadRelation.href}".toString('url') + "') format('${formatMap[preloadRelation.to.extension]}')",
                        ${JSON.stringify(props)}
                    ).load();`;
                });

                const originalFontJsPreloadAsset = htmlAsset.addRelation({
                    type: 'HtmlScript',
                    hrefType: 'inline',
                    to: {
                        type: 'JavaScript',
                        text: 'try{' + preloadData.join('') + '}catch(e){}'
                    }
                }, 'before', insertionPoint).to;

                for (const [idx, relation] of originalFontJsPreloadAsset.outgoingRelations.entries()) {
                    relation.hrefType = 'rootRelative';
                    relation.to = preloadRelations[idx].to;
                    relation.refreshHref();
                }

                originalFontJsPreloadAsset.minify();
            }
            if (subsetFontUsages.length < 1) {
                return;
            }

            const subsetCssText = getFontUsageStylesheet(subsetFontUsages);
            let cssAsset = cssAssetMap[subsetCssText];
            if (!cssAsset) {
                cssAsset = assetGraph.addAsset({
                    type: 'Css',
                    url: subsetUrl + 'subfontTemp.css',
                    text: subsetCssText,
                    _subsetFontsToBeMinified: true
                });

                cssAssetMap[subsetCssText] = cssAsset;

                if (!inlineSubsets) {
                    for (const fontRelation of cssAsset.outgoingRelations) {
                        const fontAsset = fontRelation.to;
                        const extension = fontAsset.contentType.split('/').pop();

                        const nameProps = ['font-family', 'font-weight', 'font-style']
                            .map(
                                prop => fontRelation.node.nodes.find(
                                    decl => decl.prop === prop
                                )
                            )
                            .map(decl => decl.value);

                        const fileNamePreFix = [
                            unquote(nameProps[0]).replace(/__subset$/, '').replace(/ /g, '_') + '-',
                            nameProps[1],
                            nameProps[2] === 'italic' ? 'i' : ''
                        ].join('');

                        const fontFileName = fileNamePreFix + '-' + fontAsset.md5Hex.slice(0, 10) + '.' + extension;

                        fontAsset.url = subsetUrl + fontFileName;

                        if (inlineCss) {
                            fontRelation.hrefType = 'rootRelative';
                        } else {
                            fontRelation.hrefType = 'relative';
                        }
                    }
                }

                const cssFileName = `fonts-${cssAsset.md5Hex.slice(0, 10)}.css`;
                cssAsset.url = subsetUrl + cssFileName;
            }

            if (!inlineSubsets) {
                for (const fontRelation of cssAsset.outgoingRelations) {
                    const fontAsset = fontRelation.to;

                    if (fontAsset.contentType === 'font/woff2') {
                        // Only <link rel="preload"> for woff2 files
                        // Preload support is a subset of woff2 support:
                        // - https://caniuse.com/#search=woff2
                        // - https://caniuse.com/#search=preload

                        htmlAsset.addRelation({
                            type: 'HtmlPreloadLink',
                            hrefType: 'rootRelative',
                            to: fontAsset,
                            as: 'font'
                        }, 'before', insertionPoint);
                    }
                }
            }
            const cssRelation = htmlAsset.addRelation({
                type: 'HtmlStyle',
                hrefType: inlineCss ? 'inline' : 'rootRelative',
                to: cssAsset
            }, 'before', insertionPoint);

            // JS-based font preloading for browsers without <link rel="preload"> support
            if (inlineCss) {
                // If the CSS is inlined we can use the font declarations directly to load the fonts
                htmlAsset.addRelation({
                    type: 'HtmlScript',
                    hrefType: 'inline',
                    to: {
                        type: 'JavaScript',
                        text: 'try { document.fonts.forEach(function (f) { f.family.indexOf("__subset") !== -1 && f.load(); }); } catch (e) {}'
                    }
                }, 'after', cssRelation).to.minify();
            } else {
                // The CSS is external, can't use the font face declarations without waiting for a blocking load.
                // Go for direct FontFace construction instead
                const fontFaceContructorCalls = [];

                cssAsset.parseTree.walkAtRules('font-face', rule => {
                    let name;
                    let url;
                    const props = {};

                    rule.walkDecls(({prop, value}) => {
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
                        } else if (prop === 'src') {
                            const fontRelations = cssAsset.outgoingRelations
                                .filter(relation => relation.node === rule);
                            const urlStrings = value
                                .split(/,\s*/)
                                .filter(entry => entry.startsWith('url('));
                            const urlValues = urlStrings.map(
                                (urlString, idx) => urlString.replace(fontRelations[idx].href, '\'" + "/__subfont__".toString("url") + "\'')
                            );
                            url = '"' + urlValues.join(', ') + '"';
                        }

                    });

                    fontFaceContructorCalls.push(
                        `new FontFace("${name}", ${url}, ${JSON.stringify(props)}).load();`
                    );
                });

                const jsPreloadAsset = htmlAsset.addRelation({
                    type: 'HtmlScript',
                    hrefType: 'inline',
                    to: {
                        type: 'JavaScript',
                        text: 'try {' + fontFaceContructorCalls.join('') + '} catch (e) {}'
                    }
                }, 'before', cssRelation).to.minify();

                for (const [idx, relation] of jsPreloadAsset.outgoingRelations.entries()) {
                    relation.to = cssAsset.outgoingRelations[idx].to;
                    relation.hrefType = 'rootRelative';
                    relation.refreshHref();
                }
            }
        }

        // Async load Google Web Fonts CSS

        const googleFontStylesheets = assetGraph.findAssets({
            type: 'Css',
            url: {$regex: googleFontsCssUrlRegex}
        });
        for (const googleFontStylesheet of googleFontStylesheets) {
            for (const googleFontStylesheetRelation of googleFontStylesheet.incomingRelations) {
                let htmlParents = [googleFontStylesheetRelation.from];

                if (googleFontStylesheetRelation.type === 'CssImport') {
                    // Gather Html parents. Relevant if we are dealing with CSS @import relations
                    htmlParents = getParents(assetGraph, googleFontStylesheetRelation.to, {
                        type: 'Html',
                        isInline: false,
                        isLoaded: true
                    });
                }

                for (const htmlParent of htmlParents) {
                    asyncLoadStyleRelationWithFallback(htmlParent, googleFontStylesheetRelation, htmlParent.outgoingRelations.find(
                        relation => relation.type === 'HtmlStyle'
                    ));
                }
            }
            googleFontStylesheet.unload();
        }


        // Use subsets in font-family:

        const webfontNameMap = htmlAssetTextsWithProps
            .map(pageObject => pageObject.fontUsages
                .filter(fontUsage => fontUsage.subsets)
                .map(fontUsage => fontUsage.props['font-family'])
            )
            .reduce((result, current) => {
                for (const familyName of current) {
                    result[familyName] = familyName + '__subset';
                }
                return result;
            }, {});

        // Inject subset font name before original webfont
        for (const cssAsset of assetGraph.findAssets({type: 'Css', isLoaded: true })) {
            let changesMade = false;
            cssAsset.eachRuleInParseTree(cssRule => {
                if (cssRule.type === 'decl' && cssRule.prop === 'font-family') {
                    if (cssRule.parent.type === 'rule') {
                        const fontFamilies = cssListHelpers.splitByCommas(cssRule.value).map(unquote);
                        const subsetFontFamily = webfontNameMap[fontFamilies[0]];
                        if (subsetFontFamily && !fontFamilies.includes(subsetFontFamily)) {
                            cssRule.value = cssQuoteIfNecessary(subsetFontFamily) + ', ' + cssRule.value;
                            changesMade = true;
                        }
                    }
                }
            });
            if (changesMade) {
                cssAsset.markDirty();
            }
        }

        // This is a bit awkward now, but if it's done sooner, it breaks the CSS source regexping:
        for (const cssAsset of assetGraph.findAssets({ _subsetFontsToBeMinified: true })) {
            await assetGraph.minifyCss(cssAsset);
            delete cssAsset._subsetFontsToBeMinified;
        }

        // Hand out some useful info about the detected subsets:
        return {
            fontInfo: htmlAssetTextsWithProps
                .map(({ fontUsages, htmlAsset }) => ({
                    htmlAsset: htmlAsset.urlOrDescription,
                    fontUsages: fontUsages.map(fontUsage => _.omit(fontUsage, 'subsets', 'localFamilyNames'))
                }))
        };
    };
};

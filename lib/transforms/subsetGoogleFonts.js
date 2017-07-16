var urlModule = require('url');
var queryString = require('querystring');
var _ = require('lodash');
var memoizeSync = require('memoizesync');

var AssetGraph = require('../');

var getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
var googleFontsReducer = require('../util/fonts/googleFontsReducer');
var resolveFontWeight = require('../util/fonts/resolveFontWeight');
var getGoogleIdForFontProps = require('../util/fonts/getGoogleIdForFontProps');
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

function asyncLoadStyleRelationWithFallback(htmlAsset, originalRelation) {
    var document = htmlAsset.parseTree;

    var relation = new AssetGraph.HtmlStyle({
        from: htmlAsset,
        to: originalRelation.to
    });

    relation.attach(htmlAsset, 'last');

    relation.media = originalRelation.media;

    // Attach <noscript /> at bottom of <body> and put the <link> in it
    var noScriptNode = document.createElement('noscript');
    noScriptNode.appendChild(relation.node);
    document.body.appendChild(noScriptNode);

    // Insert async CSS loading <script> before <noscript>
    var asyncCssLoadingRelation = asyncCssLoadScriptRelation(relation);
    asyncCssLoadingRelation.attach(htmlAsset, 'before', relation);

    document.body.appendChild(asyncCssLoadingRelation.node);
    document.body.appendChild(noScriptNode);


    asyncCssLoadingRelation.inline();

    htmlAsset.markDirty();
}

module.exports = function (options) {
    options = options || {};
    var verbosityLevel = options.verbosityLevel || 0;
    var subsetPerPage = !!options.subsetPerPage;

    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        // Temporary User-Agent override to trigger google to serve woff
        assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

        // Temporary User-Agent override to trigger google to serve woff2
        // assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36';

        var fontSubsetCssRelations = [];
        var googleFontSubsetNameMap = {};
        var htmlAssetTextByPropsMap = {};

        assetGraph
        // .drawGraph('before.svg')
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
                    }, true);

                    if (googleFontRelations.length > 0) {
                        Array.prototype.push.apply(accumulatedRelations, googleFontRelations);
                    }
                });

                if (accumulatedRelations.length) {
                    accumulatedRelations = _.uniq(accumulatedRelations);

                    var googleFontIds = Array.prototype.concat.apply([], accumulatedRelations
                        .map(function (googleFontRelation) {
                            return googleFontRelation.to.url;
                        })
                        .map(splitUpGoogleFontFamilyWeightCombo));

                    var weightsByFamily = googleFontIds.reduce(function (result, id) {
                        var family = id.split(':')[0].replace('+', ' ');
                        var weight = parseInt(id.split(':')[1]);

                        if (!result[family]) {
                            result[family] = [];
                        }

                        result[family] = result[family]
                            .concat([weight])
                            .sort(function (a, b) { return a - b; });

                        return result;
                    }, {});

                    var oldWeights = _.uniq(
                            Array.prototype.concat.apply(
                                [],
                                Object.keys(weightsByFamily).map(function (key) { return weightsByFamily[key]; })
                            )
                        ).sort(function (a, b) { return a - b; });

                    var textByProps = getTextByFontProperties(htmlAsset, oldWeights, memoizedGetCssRulesByProperty); // FIXME: switch to weightsByFontFamily
                    var uniqueTextByGoogleFontId = googleFontsReducer(textByProps);

                    var textsByGoogleFontId = Object.keys(uniqueTextByGoogleFontId)
                        .reduce(function (result, googleId) {
                            var obj = uniqueTextByGoogleFontId[googleId];
                            var resolvedWeight = resolveFontWeight(obj.props['font-weight'], oldWeights); // FIXME: switch to weightsByFontFamily

                            var resolvedGoogleId = getGoogleIdForFontProps(Object.assign({}, obj.props, {
                                'font-weight': resolvedWeight
                            }));

                            if (googleId !== resolvedGoogleId) {
                                var err = new Error('Found use of google font "' + googleId + '", which is not included.\nFalling back to using "' + resolvedGoogleId + '"');
                                err.asset = htmlAsset;

                                assetGraph.emit(options.strictMode ? 'warn' : 'info', err);
                            }

                            result[resolvedGoogleId] = obj.text;

                            return result;
                        }, {});

                    if (verbosityLevel > 0) {
                        console.error(htmlAsset.urlOrDescription, textsByGoogleFontId);
                    }

                    var htmlAssetTextByProps = {
                        htmlAsset: htmlAsset,
                        googleFontRelations: accumulatedRelations,
                        textsByGoogleFontId: textsByGoogleFontId
                    };

                    // console.log(htmlAssetTextByProps);

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
                    var texts = globalSubsets[googleId];

                    globalSubsets[googleId] = _.uniq(texts.join(''))
                        .sort()
                        .join('');
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
                        var cssAsset = new assetGraph.Css(assetGraph.resolveAssetConfig({
                            url: googleFontCssUrl + '?family=' + googleFontId + '&text=' + encodeURIComponent(textsByGoogleFontId[googleFontId])
                        }));
                        var individualRelation = new assetGraph.HtmlStyle({
                            to: cssAsset,
                            node: htmlAsset.parseTree.createElement('link')
                        });

                        var fontName = googleFontId.split(':')[0].replace(/\+/g, ' ');
                        googleFontSubsetNameMap[fontName] = fontName + '__subset';
                        cssAsset.fontSubsetName = googleFontSubsetNameMap[fontName];

                        fontSubsetCssRelations.push(individualRelation);

                        var firstHtmlStyleRelation = htmlAsset.outgoingRelations.find(function (relation) {
                            return relation.type === 'HtmlStyle';
                        });

                        individualRelation.attachNodeBeforeOrAfter('before', firstHtmlStyleRelation);
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
        // .drawGraph('mid1.svg')
        .queue(function moveSubsetAssetsToLocal(assetGraph) {
            fontSubsetCssRelations.forEach(function (relation) {
                var parsedUrl = urlModule.parse(relation.to.url);
                var qs = queryString.parse(parsedUrl.query);

                relation.hrefType = 'rootRelative';

                if (qs.family) {
                    var fileNamePre = qs.family.replace(' ', '+') + '-';
                    var fileName = fileNamePre + relation.to.id + '.css';
                    relation.to.url = assetGraph.root + 'google-font-subsets/' + fileName;

                    relation.to.outgoingRelations.forEach(function (fontRelation) {
                        fontRelation.hrefType = 'rootRelative';

                        var fileName = fileNamePre + fontRelation.to.id + '.woff';
                        fontRelation.to.url = assetGraph.root + 'google-font-subsets/' + fileName;

                        fontRelation.inline();
                    });
                }

                if (subsetPerPage) {
                    relation.inline();
                }
            });
        })
        // .drawGraph('mid2.svg')
        .queue(function renameSubsetFonts() {
            // Inject subset font name before original webfomt
            assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
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

                        if (cssRule.parent.type === 'atrule' && cssRule.parent.name === 'font-face' && cssAsset.fontSubsetName) {
                            cssRule.value = cssQuoteIfNecessary(cssAsset.fontSubsetName);
                            changesMade = true;
                        }
                    }
                });
                if (changesMade) {
                    cssAsset.markDirty();
                }
            });
        })
        // .drawGraph('after.svg')
        .then(function (assetGraph) {
            // Undo User-Agent override
            assetGraph.teepee.headers['User-Agent'] = assetGraphUA;

            cb();
        });
    };
};

var urlModule = require('url');
var queryString = require('querystring');
var _ = require('lodash');

var getTextByFontProperties = require('../util/fonts/getTextByFontProperties');
var googleFontsReducer = require('../util/fonts/googleFontsReducer');
var resolveFontWeight = require('../util/fonts/resolveFontWeight');
var getGoogleIdForFontProps = require('../util/fonts/getGoogleIdForFontProps');
var googleFontsUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;
var cssListHelpers = require('css-list-helpers');
var unquote = require('../util/fonts/unquote');

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

module.exports = function (options) {
    options = options || {};

    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        // Temporary User-Agent override to trigger google to serve woff
        assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

        var fontSubsetCssRelations = [];
        var googleFontSubsetNameMap = {};

        assetGraph
        .queue(function insertSubsetRelations(assetGraph) {
            // Split up google fonts combination loading, like https://fonts.googleapis.com/css?family=Jim+Nightshade|Space+Mono:400,700
            var googleFontRelations = assetGraph.findRelations({ to: { url: googleFontsUrlRegex }}, true);

            googleFontRelations
                .forEach(function (relation) {
                    var googleFontCssUrl = relation.to.url.split('?')[0];
                    var googleFontIds = splitUpGoogleFontFamilyWeightCombo(relation.to.url);

                    var textByProps;
                    var uniqueTextByGoogleId;
                    if (relation.from.type === 'Html') {
                        textByProps = getTextByFontProperties(relation.from);
                        uniqueTextByGoogleId = googleFontsReducer(textByProps);
                    } else {
                        // Might be CSS @import or other types
                    }

                    var availableWeights = googleFontIds.reduce(function (weights, id) {
                        var weight = parseInt(id.split(':')[1]);

                        if (!weights.includes(weight)) {
                            weights.push(weight);
                        }

                        return weights;
                    }, []);
                    var textsByGoogleFontId = {};

                    Object.keys(uniqueTextByGoogleId).forEach(function (googleId) {
                        var obj = uniqueTextByGoogleId[googleId];
                        var resolvedWeight = resolveFontWeight(obj.props['font-weight'], availableWeights);

                        var resolvedGoogleId = getGoogleIdForFontProps(Object.assign({}, obj.props, {
                            'font-weight': resolvedWeight
                        }));

                        if (googleId !== resolvedGoogleId) {
                            // TODO: Emit warnings about missing font variants in the <link> tag
                        }

                        if (!textsByGoogleFontId[resolvedGoogleId]) {
                            textsByGoogleFontId[resolvedGoogleId] = [];
                        }

                        textsByGoogleFontId[resolvedGoogleId].push(obj.text);
                    });

                    Object.keys(textsByGoogleFontId)
                        .forEach(function (id) {
                            textsByGoogleFontId[id] = _.uniq(textsByGoogleFontId[id].join(''))
                                .filter(function (char) { return char !== ' '; })
                                .sort()
                                .join('');
                        });

                    Object.keys(textsByGoogleFontId).forEach(function (googleFontId) {
                        if (textsByGoogleFontId[googleFontId]) {
                            var cssAsset = new assetGraph.Css(assetGraph.resolveAssetConfig({
                                url: googleFontCssUrl + '?family=' + googleFontId + '&text=' + encodeURIComponent(textsByGoogleFontId[googleFontId])
                            }));
                            var individualRelation = new assetGraph[relation.type]({
                                to: cssAsset
                            });

                            var fontName = googleFontId.split(':')[0].replace(/\+/g, ' ');
                            googleFontSubsetNameMap[fontName] = fontName + '__subset';
                            cssAsset.fontSubsetName = googleFontSubsetNameMap[fontName];

                            fontSubsetCssRelations.push(individualRelation);

                            individualRelation.attach(relation.from, 'before', relation);
                        }
                    });
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
        .queue(function (assetGraph) {
            fontSubsetCssRelations.forEach(function (relation) {
                var parsedUrl = urlModule.parse(relation.to.url);
                var qs = queryString.parse(parsedUrl.query);

                relation.hrefType = 'rootRelative';
                relation.to.url = assetGraph.root + 'google-font-subsets/' + qs.family.replace(/[^a-z0-9\.\-=,]/gi, '-') + '-' + qs.text + '.css';

                relation.to.outgoingRelations.forEach(function (fontRelation) {
                    fontRelation.hrefType = 'rootRelative';
                    fontRelation.to.url = assetGraph.root + 'google-font-subsets/' + qs.family.replace(/[^a-z0-9\.\-=,]/gi, '-') + '-' + qs.text + '-' + fontRelation.to.id + '.woff';
                });
            });
        })
        .drawGraph()
        .if(options.inlineSubsets)
            .inlineRelations({
                type: 'CssFontFaceSrc',
                from: {
                    url: googleFontsUrlRegex
                }
            })
            .inlineRelations({
                to: {
                    url: googleFontsUrlRegex
                }
            })
        .endif()
        .queue(function () {
            // Inject subset font name before original webfomt
            assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                var changesMade = false;
                cssAsset.eachRuleInParseTree(function (cssRule) {
                    if (cssRule.type === 'decl' && cssRule.prop === 'font-family') {
                        if (cssRule.parent.type === 'rule') {
                            var fontFamilies = cssListHelpers.splitByCommas(cssRule.value).map(unquote);
                            var subsetFontFamily = googleFontSubsetNameMap[fontFamilies[0]];
                            if (subsetFontFamily && !fontFamilies.includes(subsetFontFamily)) {
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
        .then(function (assetGraph) {
            // Undo User-Agent override
            assetGraph.teepee.headers['User-Agent'] = assetGraphUA;

            cb();
        });
    };
};

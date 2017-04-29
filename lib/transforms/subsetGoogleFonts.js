var urlModule = require('url');

var getTextByFontFace = require('../util/getTextByFontFace');
var googleFontsUrlRegex = /^(?:https?:)?\/\/fonts\.googleapis\.com\/css/;
var cssListHelpers = require('css-list-helpers');
var unquote = require('../util/fonts/unquote');

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

        var urls = fonts.map(function (font) {
            return urlModule.format(Object.assign({}, parsedUrl, {
                search: '?family=' + font
            }));
        });

        return urls;
    }
}

module.exports = function (options) {
    options = options || {};

    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        // Temporary User-Agent override to trigger google to serve woff
        assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

        assetGraph
        .queue(function (assetGraph) {
            // Split up google fonts combination loading, like https://fonts.googleapis.com/css?family=Jim+Nightshade|Space+Mono:400,700
            assetGraph.findRelations({ to: { url: googleFontsUrlRegex }}, true)
                .forEach(function (relation) {
                    var individualUrls = splitUpGoogleFontFamilyWeightCombo(relation.to.url);

                    if (individualUrls.length > 1) {
                        // Replace relation with one per individual url CSS copy
                        individualUrls.forEach(function (url) {
                            var cssAsset = new assetGraph.Css(assetGraph.resolveAssetConfig({
                                url: url
                            }));
                            var individualRelation = new assetGraph[relation.type]({
                                to: cssAsset
                            });

                            individualRelation.attach(relation.from, 'before', relation);
                        });

                        relation.detach();
                    }
                });
        })
        .populate({
            followRelations: {
                to: { url: googleFontsUrlRegex }
            }
        })
        .queue(function (assetGraph) {
            var textByFontFace = getTextByFontFace(assetGraph);

            Object.keys(textByFontFace).forEach(function (googleShortName) {
                var subsetConfig = textByFontFace[googleShortName];
                var oldAsset = subsetConfig.fontProps.relation.from;

                if (googleFontsUrlRegex.test(oldAsset.url)) {
                    oldAsset.replaceWith(new assetGraph.Css(assetGraph.resolveAssetConfig({
                        url: oldAsset.url + '&text=' + encodeURIComponent(subsetConfig.chars.join(''))
                    })));
                }
            });
        })
        .populate({
            from: {
                url: googleFontsUrlRegex
            },
            followRelations: {
                type: 'CssFontFaceSrc'
            }
        })
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
            // FIXME: Get the real mapping from somewhere
            var subsetNameByOriginalFontFamily = {
                'Roboto': 'Robosubset',
                'Open Sans': 'OS subset'
            };
            assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
                var changesMade = false;
                cssAsset.eachRuleInParseTree(function (cssRule) {
                    if (cssRule.type === 'decl' && cssRule.prop === 'font-family' && cssRule.parent.type === 'rule') {
                        var fontFamilies = cssListHelpers.splitByCommas(cssRule.value).map(unquote);
                        var subsetFontFamily = subsetNameByOriginalFontFamily[fontFamilies[0]];
                        if (subsetFontFamily && !fontFamilies.includes(subsetFontFamily)) {
                            if (/^\w+$/.test(subsetFontFamily)) {
                                cssRule.value = subsetFontFamily + ', ' + cssRule.value;
                            } else {
                                cssRule.value = '\'' + subsetFontFamily.replace(/'/g, '\\\'') + '\'' + ', ' + cssRule.value;
                            }
                            changesMade = true;
                        }
                    }
                });
                if (changesMade) {
                    cssAsset.markDirty();
                }
            });
        })
        // .drawGraph()
        .then(function (assetGraph) {
            // Undo User-Agent override
            assetGraph.teepee.headers['User-Agent'] = assetGraphUA;

            cb();
        });
    };
};

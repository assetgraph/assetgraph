var urlModule = require('url');
var queryString = require('querystring');
var _ = require('lodash');

var AssetGraph = require('../');

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

function asyncCssLoadScriptRelation(relation) {
    var scriptText = [
        '(function () {',
        '  var el = document.createElement(\'link\');',
        '  el.href = \'' + relation.to.url + '\'.toString(\'url\');',
        '  el.rel = \'stylesheet\';',
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

function moveStyleRelationToBottomOfBody(relation) {
    var asset = relation.from;
    if (asset.type === 'Html') {
        var document = asset.parseTree;

        relation.attachNodeBeforeOrAfter('after', asset.outgoingRelations.pop());
        document.body.appendChild(relation.node);

        asset.markDirty();
    }

    return relation;
}

function asyncLoadStyleRelationWithFallback(relation) {
    var asset = relation.from;

    moveStyleRelationToBottomOfBody(relation);

    if (asset.type === 'Html') {
        var document = asset.parseTree;
        var noScriptNode = document.createElement('noscript');
        var asyncCssLoadingRelation = asyncCssLoadScriptRelation(relation);

        asyncCssLoadingRelation.attachNodeBeforeOrAfter('before', relation);

        // console.log('before inline')
        // console.log(asyncCssLoadingRelation.to.incomingRelations);
        asyncCssLoadingRelation.inline();
        // console.log('after inline')

        document.body.insertBefore(noScriptNode, relation.node);
        noScriptNode.appendChild(relation.node);

        asset.markDirty();
    }
}

module.exports = function (options) {
    options = options || {};
    var verbosityLevel = options.verbosityLevel || 0;

    return function subsetGoogleFonts(assetGraph, cb) {
        // Save AssetGraph User-Agent for later
        var assetGraphUA = assetGraph.teepee.headers['User-Agent'];
        // Temporary User-Agent override to trigger google to serve woff
        assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

        // Temporary User-Agent override to trigger google to serve woff2
        // assetGraph.teepee.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.96 Safari/537.36';

        var fontSubsetCssRelations = [];
        var googleFontSubsetNameMap = {};

        assetGraph
        // .drawGraph('before.svg')
        .queue(function insertSubsetRelations(assetGraph) {
            // Split up google fonts combination loading, like https://fonts.googleapis.com/css?family=Jim+Nightshade|Space+Mono:400,700
            var googleFontRelations = assetGraph.findRelations({ to: { url: googleFontsUrlRegex }}, true);

            googleFontRelations
                .forEach(function (relation) {
                    var googleFontCssUrl = relation.to.url.split('?')[0];
                    var googleFontIds = splitUpGoogleFontFamilyWeightCombo(relation.to.url);

                    var availableWeights = googleFontIds.reduce(function (weights, id) {
                        var weight = parseInt(id.split(':')[1]);

                        if (weights.indexOf(weight) === -1) {
                            weights.push(weight);
                        }

                        return weights;
                    }, [])
                    .sort(function (a, b) { return a - b; });

                    var textByProps;
                    var uniqueTextByGoogleId;
                    if (relation.from.type === 'Html') {
                        textByProps = getTextByFontProperties(relation.from, availableWeights);
                        // console.error(textByProps);
                        uniqueTextByGoogleId = googleFontsReducer(textByProps);
                    } else {
                        // Might be CSS @import or other types
                    }

                    if (!uniqueTextByGoogleId) {
                        return;
                    }

                    var textsByGoogleFontId = {};

                    Object.keys(uniqueTextByGoogleId).forEach(function (googleId) {
                        var obj = uniqueTextByGoogleId[googleId];
                        var resolvedWeight = resolveFontWeight(obj.props['font-weight'], availableWeights);

                        var resolvedGoogleId = getGoogleIdForFontProps(Object.assign({}, obj.props, {
                            'font-weight': resolvedWeight
                        }));

                        if (googleId !== resolvedGoogleId) {
                            var err = new Error('Found use of google font "' + googleId + '", which is not included in ' + relation.to.url + '.\nFalling back to using "' + resolvedGoogleId + '"');
                            err.asset = relation.from;

                            assetGraph.emit(options.strictMode ? 'warn' : 'info', err);
                        }

                        if (!textsByGoogleFontId[resolvedGoogleId]) {
                            textsByGoogleFontId[resolvedGoogleId] = [];
                        }

                        textsByGoogleFontId[resolvedGoogleId].push(obj.text);
                    });

                    Object.keys(textsByGoogleFontId)
                        .forEach(function (id) {
                            textsByGoogleFontId[id] = _.uniq(textsByGoogleFontId[id].join(''))
                                .sort()
                                .join('');
                        });

                    if (verbosityLevel > 0) {
                        console.error(relation.from.nonInlineAncestor.urlOrDescription, textsByGoogleFontId);
                    }

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

                    if (options.asyncGoogleCss) {
                        asyncLoadStyleRelationWithFallback(relation);
                    } else {
                        moveStyleRelationToBottomOfBody(relation);
                    }
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

                        if (options.inlineSubsets) {
                            fontRelation.inline();
                        }
                    });
                }


                if (options.inlineSubsets) {
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

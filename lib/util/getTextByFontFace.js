var _ = require('lodash');

function unQuote(str) {
    return str.replace(/^'([^']*)'$|^"([^"]*)"$/, function ($0, singleQuoted, doubleQuoted) {
        return typeof singleQuoted === 'string' ? singleQuoted.replace(/\\'/g, '\'') : doubleQuoted.replace(/\\"/g, '"');
    });
}

var FONT_PROPS = [
    'font-family',
    'font-weight',
    'font-style'
];

function getCssFontPropsForRule(rule) {
    return rule.nodes.reduce(function (fontProps, node) {
        if (FONT_PROPS.indexOf(node.prop) !== -1) {
            fontProps[node.prop] = node.value;
        }

        return fontProps;
    }, {});
}

function getFontPropsFromCssProps(cssFontProps) {
    var fontProps = {
        cssProps: cssFontProps
    };

    if (cssFontProps['font-family']) {
        fontProps.name = unQuote(cssFontProps['font-family']);
    }

    if (cssFontProps['font-weight']) {
        fontProps.weight = cssFontProps['font-weight'];
    }

    if (cssFontProps['font-style']) {
        fontProps.italic = cssFontProps['font-style'] === 'italic';
    }

    if (cssFontProps['font-family']) {
        fontProps.name = unQuote(cssFontProps['font-family']);
    }

    fontProps.googleShortName = [fontProps.name, ':', fontProps.weight || '', fontProps.italic ? 'i' : ''].join('');

    return fontProps;
}

function getTextByFontFace(assetGraph) {
    var fontFamilyDefinitionsByName = {};
    // TODO: Take multiple CssFontFaceSrc in the same @font-face into account
    assetGraph.findRelations({type: 'CssFontFaceSrc'}, true).forEach(function (cssFontFaceSrc) {
        var fontProps = getFontPropsFromCssProps(getCssFontPropsForRule(cssFontFaceSrc.node));

        fontFamilyDefinitionsByName[fontProps.googleShortName] = Object.assign(fontProps, {
            relation: cssFontFaceSrc
        });
    });

    // console.log('fontFamilyDefinitionsByName', fontFamilyDefinitionsByName);

    var selectorsByFontProperties = {};

    assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
        cssAsset.constructor.eachRuleInParseTree(cssAsset.parseTree, function (cssRule) {
            if (cssRule.type === 'rule') {
                cssRule.walk(function (node) {
                    if (node.prop === 'font-family') {
                        node.value
                            .split(/\s*,\s*/)
                            .map(unQuote)
                            .forEach(function (fontFaceFragment) {
                                // TODO: Figure out how to deal with multiple font fallbacks
                                var cssFontProps = getCssFontPropsForRule(node.parent);

                                // TODO: Handle thing like 'normal', 'bold'?
                                if (!cssFontProps['font-weight']) {
                                    cssFontProps['font-weight'] = '400';
                                }

                                var fontProps = getFontPropsFromCssProps(cssFontProps);

                                if (fontProps.googleShortName in fontFamilyDefinitionsByName) {
                                    if (selectorsByFontProperties[fontProps.googleShortName]) {
                                        Array.prototype.push.apply(selectorsByFontProperties[fontProps.googleShortName], cssRule.selectors);
                                    } else {
                                        selectorsByFontProperties[fontProps.googleShortName] = [].concat(cssRule.selectors);
                                    }
                                }
                            });
                    }
                });
            }
        });
    });

    // console.log('selectorsByFontProperties', selectorsByFontProperties);

    var textByFontFace = {};

    assetGraph.findAssets({type: 'Html'}).forEach(function (htmlAsset) {
        Object.keys(selectorsByFontProperties).forEach(function (googleShortName) {
            textByFontFace[googleShortName] = textByFontFace[googleShortName] || {
                textContent: '',
                chars: [],
                fontProps: fontFamilyDefinitionsByName[googleShortName]
            };

            selectorsByFontProperties[googleShortName].forEach(function (selector) {
                // TODO: Preprocess selector to avoid pseudo-classes that
                // won't make sense on a non-live document:
                Array.prototype.forEach.call(htmlAsset.parseTree.querySelectorAll(selector), function (element) {
                    // Extract text content of node and all children
                    // TODO: Could be improved by subtracting all children whose
                    // font-face will be overridden by another rule.
                    textByFontFace[googleShortName].textContent += element.textContent;
                });
            });
        });
    });


    Object.keys(textByFontFace).forEach(function (fontFamilyName) {
        textByFontFace[fontFamilyName].chars = _.uniq(textByFontFace[fontFamilyName].textContent)
            .filter(function (ch) {
                return /^\S$/.test(ch);
            })
            .sort();
    });

    // console.log('textByFontFace', textByFontFace);

    return textByFontFace;
}

module.exports = getTextByFontFace;

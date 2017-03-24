var _ = require('lodash');

function unQuote(str) {
    return str.replace(/^'([^']*)'$|^"([^"]*)"$/, function ($0, singleQuoted, doubleQuoted) {
        return typeof singleQuoted === 'string' ? singleQuoted.replace(/\\'/g, '\'') : doubleQuoted.replace(/\\"/g, '"');
    });
}

function getTextByFontFace(assetGraph) {
    var fontFamilyDefinitionsByName = {};
    // TODO: Take multiple CssFontFaceSrc in the same @font-face into account
    assetGraph.findRelations({type: 'CssFontFaceSrc'}, true).forEach(function (cssFontFaceSrc) {
        var nameNodes = cssFontFaceSrc.node.nodes.filter(function (node) {
            return node.prop === 'font-family';
        });
        if (nameNodes.length === 1) {
            var name = unQuote(nameNodes[0].value);
            (fontFamilyDefinitionsByName[name] = fontFamilyDefinitionsByName[name] || []).push(cssFontFaceSrc);
        }
    });

    // Disregard fonts that are already defined by multiple @font-face blocks:
    var fontFacesToSubset = Object.keys(fontFamilyDefinitionsByName).filter(function (fontFamilyName) {
        return fontFamilyDefinitionsByName[fontFamilyName].length === 1;
    });

    var selectorsByFontFaceName = {};

    assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
        cssAsset.constructor.eachRuleInParseTree(cssAsset.parseTree, function (cssRule) {
            if (cssRule.type === 'rule') {
                cssRule.walk(function (node) {
                    if (node.prop === 'font-family') {
                        node.value
                            .split(/\s*,\s*/)
                            .map(unQuote)
                            .forEach(function (fontFaceFragment) {
                                if (fontFacesToSubset.indexOf(fontFaceFragment) !== -1) {
                                    if (selectorsByFontFaceName[fontFaceFragment]) {
                                        Array.prototype.push.apply(selectorsByFontFaceName[fontFaceFragment], cssRule.selectors);
                                    } else {
                                        selectorsByFontFaceName[fontFaceFragment] = [].concat(cssRule.selectors);
                                    }
                                }
                            });
                    }
                });
            }
        });
    });

    var textByFontFace = {};

    assetGraph.findAssets({type: 'Html'}).forEach(function (htmlAsset) {
        Object.keys(selectorsByFontFaceName).forEach(function (fontFamilyName) {
            textByFontFace[fontFamilyName] = textByFontFace[fontFamilyName] || {
                textContent: '',
                chars: [],
                cssFontFaceSrc: fontFamilyDefinitionsByName[fontFamilyName][0]
            };
            selectorsByFontFaceName[fontFamilyName].forEach(function (selector) {
                // TODO: Preprocess selector to avoid pseudo-classes that
                // won't make sense on a non-live document:
                Array.prototype.forEach.call(htmlAsset.parseTree.querySelectorAll(selector), function (element) {
                    // Extract text content of node and all children
                    // TODO: Could be improved by subtracting all children whose
                    // font-face will be overridden by another rule.
                    textByFontFace[fontFamilyName].textContent += element.textContent;
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

    return textByFontFace;
}

module.exports = getTextByFontFace;

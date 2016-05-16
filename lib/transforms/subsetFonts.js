var fs = require('fs');
var childProcess = require('child_process');
var _ = require('lodash');
var passError = require('passerror');
var async = require('async');
var getTemporaryFilePath = require('gettemporaryfilepath');

module.exports = function (queryObj) {
    return function subsetFonts(assetGraph, cb) {
        var fontFamilyDefinitionsByName = {};
        // TODO: Take multiple CssFontFaceSrc in the same @font-face into account
        assetGraph.findRelations({type: 'CssFontFaceSrc'}).forEach(function (cssFontFaceSrc) {
            var nameNodes = cssFontFaceSrc.node.nodes.filter(function (node) {
                return node.prop === 'font-family';
            });
            if (nameNodes.length === 1) {
                var name = nameNodes[0].value.replace(/^'([^']*)'$|^"([^"]*)"$/, function ($0, singleQuoted, doubleQuoted) {
                    return typeof singleQuoted === 'string' ? singleQuoted.replace(/\\'/g, '\'') : doubleQuoted.replace(/\\"/g, '"');
                });
                (fontFamilyDefinitionsByName[name] = fontFamilyDefinitionsByName[name] || []).push(cssFontFaceSrc);
            }
        });

        // Disregard fonts that are already defined by multiple @font-face blocks:
        var fontFacesToSubset = Object.keys(fontFamilyDefinitionsByName).filter(function (fontFamilyName) {
            return fontFamilyDefinitionsByName[fontFamilyName].length === 1 && fontFamilyDefinitionsByName[fontFamilyName][0].to.isLoaded;
        });
        var selectorsByFontFaceName = {};

        assetGraph.findAssets({type: 'Css'}).forEach(function (cssAsset) {
            cssAsset.constructor.eachRuleInParseTree(cssAsset.parseTree, function (cssRule) {
                if (cssRule.type === 'rule') {
                    cssRule.walk(function (node) {
                        if (node.prop === 'font-family') {
                            node.value.split(/\s*,\s*/).forEach(function (fontFaceFragment) {
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
                textByFontFace[fontFamilyName] = textByFontFace[fontFamilyName] || '';
                selectorsByFontFaceName[fontFamilyName].forEach(function (selector) {
                    // TODO: Preprocess selector to avoid pseudo-classes that
                    // won't make sense on a non-live document:
                    Array.prototype.forEach.call(htmlAsset.parseTree.querySelectorAll(selector), function (element) {
                        // Extract text content of node and all children
                        // TODO: Could be improved by subtracting all children whose
                        // font-face will be overridden by another rule.
                        textByFontFace[fontFamilyName] += element.textContent;
                    });
                });
            });
        });

        var fontFamiliesToSubset = Object.keys(textByFontFace);

        async.eachLimit(fontFamiliesToSubset, 5, function (fontFamilyName, cb) {
            var chars = _.uniq(textByFontFace[fontFamilyName]).filter(function (ch) {
                return /^\S$/.test(ch);
            }).sort();
            var cssFontFaceSrc = fontFamilyDefinitionsByName[fontFamilyName][0];
            var inputFileName = getTemporaryFilePath({suffix: cssFontFaceSrc.to.extension});
            var outputFileName = getTemporaryFilePath({suffix: cssFontFaceSrc.to.extension});
            fs.writeFile(inputFileName, cssFontFaceSrc.to.rawSrc, passError(cb, function () {
                var javaProcess = childProcess.spawn('java', ['-jar', 'node_modules/fontler/lib/sfntly.jar', '-s', chars.join(''), inputFileName, outputFileName]);
                javaProcess.stdout.on('data', function () {});
                javaProcess.stderr.on('data', function () {});
                javaProcess.on('exit', function (exitCode) {
                    if (exitCode) {
                        return cb(new Error('java/sfntly exited with a non-zero exit code: ' + exitCode));
                    }
                    fs.readFile(outputFileName, passError(cb, function (rawSrc) {
                        if (rawSrc.length < cssFontFaceSrc.to.rawSrc.length - 2048) {
                            var subsetFontAsset = new assetGraph.Asset({
                                url: assetGraph.root + 'subset-' + (cssFontFaceSrc.to.fileName || encodeURIComponent(fontFamilyName)) + cssFontFaceSrc.to.extension,
                                rawSrc: rawSrc
                            });
                            assetGraph.addAsset(subsetFontAsset);
                            cssFontFaceSrc.node.parent.append({
                                name: 'font-face'
                            });
                            var newFontFaceRule = cssFontFaceSrc.node.parent.last;
                            newFontFaceRule.append({
                                prop: 'font-family',
                                value: fontFamilyName
                            });
                            var unicodeRangeTokens = [];
                            var currentRangeStart;
                            var currentRangeEnd;
                            function flush() {
                                if (currentRangeStart) {
                                    var unicodeRangeToken = 'U+' + currentRangeStart.toString(16).toUpperCase();
                                    if (currentRangeStart !== currentRangeEnd) {
                                        unicodeRangeToken += '-' + currentRangeEnd.toString(16).toUpperCase();
                                    }
                                    unicodeRangeTokens.push(unicodeRangeToken);
                                    currentRangeStart = currentRangeEnd = undefined;
                                }
                            }
                            chars.forEach(function (ch, i) {
                                var charCode = ch.charCodeAt(0);
                                if (currentRangeStart) {
                                    if (charCode === currentRangeEnd + 1) {
                                        currentRangeEnd = charCode;
                                    } else {
                                        flush();
                                        currentRangeStart = currentRangeEnd = charCode;
                                    }
                                } else {
                                    currentRangeStart = currentRangeEnd = charCode;
                                }
                            });
                            flush();
                            newFontFaceRule.append({
                                prop: 'unicode-range',
                                value: unicodeRangeTokens.join(', ')
                            });
                            assetGraph.addRelation(new assetGraph.CssFontFaceSrc({
                                node: newFontFaceRule,
                                parentNode: newFontFaceRule.parent,
                                from: cssFontFaceSrc.from,
                                to: subsetFontAsset
                            }), 'after', cssFontFaceSrc);
                            cssFontFaceSrc.from.markDirty();
                            cb();
                        } else {
                            // Not worth it
                            cb();
                        }
                    }));
                });
            }));
        }, cb);
    };
};

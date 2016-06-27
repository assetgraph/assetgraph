var _ = require('lodash');
var postcss = require('postcss');
var Css = require('../assets/Css');

module.exports = function (queryObj, options) {
    options = options || {};
    // http://blogs.msdn.com/b/ieinternals/archive/2011/05/14/internet-explorer-stylesheet-rule-selector-import-sheet-limit-maximum.aspx
    var minimumIeVersion = typeof options.minimumIeVersion === 'undefined' ? 1 : options.minimumIeVersion,
        rulesPerStylesheetLimit = options.rulesPerStylesheetLimit;

    if (typeof rulesPerStylesheetLimit === 'undefined') {
        if (minimumIeVersion === null) {
            rulesPerStylesheetLimit = Infinity;
        } else if (minimumIeVersion <= 9) {
            rulesPerStylesheetLimit = 4095;
        } else {
            rulesPerStylesheetLimit = 65534;
        }
    }

    function countRules(node) {
        var count = 0;

        if (node.selector) {
            count += node.selector.split(',').length;
        }

        if (Array.isArray(node.nodes)) {
            // FIXME: Verify that this counting algorithm is identical to what IE does
            node.nodes.forEach(function (childNode) {
                count += countRules(childNode);
            });
        }

        return count;
    }

    function splitStyleSheet(cssAsset) {
        var output = [],
            accumulatedRules = 0,
            offset = 0;

        cssAsset.parseTree.nodes.forEach(function (rule, idx) {
            var selectors = countRules(rule);

            if (accumulatedRules + selectors <= rulesPerStylesheetLimit) {
                accumulatedRules += selectors;
            } else {
                output.push({
                    type: cssAsset.type,
                    isPopulated: false,
                    parseTree: postcss.root().append(cssAsset.parseTree.nodes.slice(offset, idx).map(Css.cloneWithRaws))
                });

                offset = idx;
                accumulatedRules = selectors;
            }
        });

        output.push({
            type: cssAsset.type,
            isPopulated: false,
            parseTree: postcss.root().append(cssAsset.parseTree.nodes.slice(offset).map(Css.cloneWithRaws))
        });

        return output;
    }

    return function splitCssIfIeLimitIsReached(assetGraph) {
        if (rulesPerStylesheetLimit === Infinity) {
            return;
        }
        assetGraph.findAssets(_.extend({type: 'Css', isLoaded: true}, queryObj)).forEach(function (largeAsset) {
            var count = countRules(largeAsset.parseTree),
                info,
                replacements;

            if (count > rulesPerStylesheetLimit) {
                replacements = splitStyleSheet(largeAsset);
                info = new Error(count + ' CSS rules, ' + (count - rulesPerStylesheetLimit) + ' would be ignored by IE9 and below. Splitting into ' + replacements.length + ' chunks to resolve the problem.');
                info.asset = largeAsset;
                assetGraph.emit('info', info);

                // Add replacement css assets to the graph
                replacements = replacements.map(function (replacement, idx) {
                    var asset = assetGraph.createAsset(replacement);

                    if (!largeAsset.isInline) {
                        asset.url = require('url').resolve(largeAsset.url, largeAsset.fileName.split('.').shift() + '-' + idx + largeAsset.extension);
                    }

                    assetGraph.addAsset(asset);

                    return asset;
                });

                // Add relations to new replacement assets to the graph
                largeAsset.incomingRelations.forEach(function (oldRelation) {
                    replacements.forEach(function (replacement) {
                        var newIncomingRelation = new assetGraph[oldRelation.type]({
                            to: replacement
                        });
                        newIncomingRelation.attach(oldRelation.from, 'before', oldRelation);
                        if (replacement.isInline) {
                            newIncomingRelation.inline();
                        }
                    });
                });

                // Remove all traces of the oiginal to large Css asset
                assetGraph.removeAsset(largeAsset, true);
            }
        });
    };
};
